import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:40431';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || '';

async function call(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

function snapshot(name, address, sharing = {}) {
  return {
    candidateName: name,
    address,
    plan: { washType: '손세차형', bayCount: '3베이' },
    overallStatus: 'conditional',
    progress: { completed: 1, total: 2, unchecked: 1 },
    steps: [{ id: '1', label: '후보지 사전 확인', completed: false, status: 'conditional' }],
    checks: [
      { id: '1-0', step: '1', label: '토지이용계획상 용도지역', completed: true },
      { id: '1-1', step: '1', label: '건축물대장상 현재 용도', completed: false },
    ],
    notes: [{ id: '1-0', label: '토지이용계획상 용도지역', text: `${name} 비공개 메모` }],
    sharing: { address: false, plan: false, notes: false, photos: false, ...sharing },
  };
}

const noConsent = await call('/api/consultations', {
  method: 'POST', body: JSON.stringify({ clientCandidateRef: 'candidate-no', snapshot: snapshot('동의 없음', '비공개'), question: '동의 전송 차단 테스트', consent: false }),
});
assert.equal(noConsent.response.status, 400);

const first = await call('/api/consultations', {
  method: 'POST', body: JSON.stringify({ clientCandidateRef: 'candidate-a', snapshot: snapshot('후보지 A', '서버에 가면 안 되는 주소'), question: 'A 후보지 질문입니다.', consent: true }),
});
assert.equal(first.response.status, 201);
assert.ok(first.payload.accessKey.length >= 32);
assert.equal(first.payload.consultation.snapshot.address, '');
assert.equal(first.payload.consultation.snapshot.notes.length, 0);
assert.equal(first.payload.consultation.snapshot.plan, null);

const wrongKey = await call(`/api/consultations/${first.payload.consultation.receipt}`, { headers: { 'x-consultation-key': 'wrong-key' } });
assert.equal(wrongKey.response.status, 404);

const second = await call('/api/consultations', {
  method: 'POST', body: JSON.stringify({
    clientCandidateRef: 'candidate-b',
    snapshot: snapshot('후보지 B', '공유 승인 주소', { address: true, plan: true, notes: true, photos: true }),
    question: 'B 후보지 질문입니다.', consent: true,
  }),
});
assert.equal(second.response.status, 201);
assert.notEqual(first.payload.consultation.receipt, second.payload.consultation.receipt);
assert.equal(second.payload.consultation.snapshot.address, '공유 승인 주소');
assert.equal(second.payload.consultation.snapshot.notes.length, 1);

const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const photo = await call(`/api/consultations/${second.payload.consultation.receipt}/photos`, {
  method: 'POST',
  headers: { 'x-consultation-key': second.payload.accessKey },
  body: JSON.stringify({ name: 'test.png', mime: 'image/png', data: png }),
});
assert.equal(photo.response.status, 201);
assert.equal(photo.payload.consultation.attachments.length, 1);

function fullCandidate(reference, name, completedSteps, marker) {
  const sharing = { address: true, plan: true, notes: true, photos: true };
  const steps = Array.from({ length: 12 }, (_, index) => ({
    id: String(index + 1), label: `${index + 1}부`, completed: index < completedSteps,
    status: index < completedSteps ? 'possible' : 'unreviewed',
  }));
  const checks = Array.from({ length: 12 }, (_, index) => ({
    id: `${index + 1}-${marker}`, step: String(index + 1), label: `${name} ${index + 1}부 확인`, completed: index < completedSteps,
  }));
  return {
    candidateRef: reference, candidateName: name, address: `${name} 공유 주소`,
    plan: { washType: `${name}형`, bayCount: `${completedSteps}베이` }, overallStatus: 'conditional',
    progress: { completed: completedSteps, total: 12, unchecked: 12 - completedSteps },
    steps, checks, notes: [{ id: `1-${marker}`, label: `${name} 1부 확인`, text: `${name} 전용 메모` }], sharing,
  };
}

const bundleSnapshot = {
  version: 2,
  candidates: [
    fullCandidate('candidate-multi-a', '복수 후보지 A', 3, 'a'),
    fullCandidate('candidate-multi-b', '복수 후보지 B', 7, 'b'),
  ],
  sharing: { address: true, plan: true, notes: true, photos: true },
};
const bundle = await call('/api/consultations', {
  method: 'POST', body: JSON.stringify({
    clientCandidateRefs: ['candidate-multi-a', 'candidate-multi-b'],
    snapshot: bundleSnapshot, question: '두 후보지의 12부 전체 비교 요청', consent: true,
  }),
});
assert.equal(bundle.response.status, 201);
assert.equal(bundle.payload.consultation.snapshot.version, 2);
assert.equal(bundle.payload.consultation.snapshot.candidates.length, 2);
assert.equal(bundle.payload.consultation.snapshot.candidateCount, 2);
assert.equal(bundle.payload.consultation.snapshot.candidates[0].steps.length, 12);
assert.equal(bundle.payload.consultation.snapshot.candidates[1].notes[0].text, '복수 후보지 B 전용 메모');
assert.equal(bundle.payload.consultation.snapshot.candidates[1].notes[0].step, '1');
assert.equal(JSON.stringify(bundle.payload.consultation.snapshot).includes('candidate-unselected'), false);

const bundlePhoto = await call(`/api/consultations/${bundle.payload.consultation.receipt}/photos`, {
  method: 'POST', headers: { 'x-consultation-key': bundle.payload.accessKey },
  body: JSON.stringify({ name: 'multi-a.png', mime: 'image/png', data: png, candidateRef: 'candidate-multi-a' }),
});
assert.equal(bundlePhoto.response.status, 201);
assert.equal(bundlePhoto.payload.consultation.attachments[0].candidateRef, 'candidate-multi-a');

const mismatchedBundle = await call('/api/consultations', {
  method: 'POST', body: JSON.stringify({
    clientCandidateRefs: ['candidate-multi-a', 'candidate-unselected'],
    snapshot: bundleSnapshot, question: '후보지 참조 불일치 차단', consent: true,
  }),
});
assert.equal(mismatchedBundle.response.status, 400);

const userMessage = await call(`/api/consultations/${first.payload.consultation.receipt}/messages`, {
  method: 'POST',
  headers: { 'x-consultation-key': first.payload.accessKey },
  body: JSON.stringify({ body: 'A 후보지 추가 질문' }),
});
assert.equal(userMessage.response.status, 201);
assert.equal(userMessage.payload.consultation.messages[0].body, 'A 후보지 추가 질문');

if (adminPassword) {
  const login = await call('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: adminPassword }) });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get('set-cookie').split(';')[0];
  const adminHeaders = { cookie, 'x-admin-request': '1' };
  const list = await call('/api/admin/consultations', { headers: adminHeaders });
  assert.equal(list.response.status, 200);
  assert.equal(list.payload.consultations.length, 3);
  const bundleListItem = list.payload.consultations.find((item) => item.receipt === bundle.payload.consultation.receipt);
  assert.equal(bundleListItem.candidateCount, 2);
  assert.equal(bundleListItem.progress.completed, 10);
  const answer = await call(`/api/admin/consultations/${first.payload.consultation.receipt}/messages`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ body: 'A 후보지 관리자 답변', contextId: '1-1', contextLabel: '건축물대장상 현재 용도' }),
  });
  assert.equal(answer.response.status, 201);
  const status = await call(`/api/admin/consultations/${first.payload.consultation.receipt}`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'answered' }),
  });
  assert.equal(status.response.status, 200);
  const userView = await call(`/api/consultations/${first.payload.consultation.receipt}`, { headers: { 'x-consultation-key': first.payload.accessKey } });
  assert.equal(userView.payload.consultation.status, 'answered');
  assert.equal(userView.payload.consultation.messages.at(-1).body, 'A 후보지 관리자 답변');
  assert.equal(userView.payload.consultation.messages.at(-1).contextId, '1-1');
  const bundleAnswer = await call(`/api/admin/consultations/${bundle.payload.consultation.receipt}/messages`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ body: '복수 A 전용 답변', contextId: 'candidate-multi-a:1-a', contextLabel: '복수 후보지 A · 1부' }),
  });
  assert.equal(bundleAnswer.response.status, 201);
  assert.equal(bundleAnswer.payload.consultation.messages.at(-1).contextId, 'candidate-multi-a:1-a');
}

const firstView = await call(`/api/consultations/${first.payload.consultation.receipt}`, { headers: { 'x-consultation-key': first.payload.accessKey } });
const secondView = await call(`/api/consultations/${second.payload.consultation.receipt}`, { headers: { 'x-consultation-key': second.payload.accessKey } });
assert.equal(firstView.payload.consultation.snapshot.candidateName, '후보지 A');
assert.equal(secondView.payload.consultation.snapshot.candidateName, '후보지 B');
assert.equal(firstView.payload.consultation.attachments.length, 0);
assert.equal(secondView.payload.consultation.attachments.length, 1);
const bundleView = await call(`/api/consultations/${bundle.payload.consultation.receipt}`, { headers: { 'x-consultation-key': bundle.payload.accessKey } });
assert.equal(bundleView.payload.consultation.snapshot.candidates[0].candidateName, '복수 후보지 A');
assert.equal(bundleView.payload.consultation.snapshot.candidates[1].candidateName, '복수 후보지 B');
assert.equal(bundleView.payload.consultation.attachments[0].candidateRef, 'candidate-multi-a');
assert.equal(bundleView.payload.consultation.snapshot.candidates[0].notes[0].step, '1');

console.log('consultation smoke: PASS');
