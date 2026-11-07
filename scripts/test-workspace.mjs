import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { createWorkspaceStore, WorkspaceError } from '../workspace-store.mjs';
import { createWorkspacePreview, demoPrincipals } from '../workspace-preview.mjs';

const id = () => randomUUID();
const proof = { source: '시험용 관할기관 회신', checkedBy: '시험 확인 주체', checkedAt: '2026-11-07', recheck: true, recheckReason: '현장과 실제 담당기관의 추가 확인 필요' };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
function expectError(work, status, code) { assert.throws(work, error => error instanceof WorkspaceError && error.status === status && (!code || error.code === code)); }
function fixture(t, path = ':memory:') {
  const s = createWorkspaceStore(path);
  for (const p of demoPrincipals) s.registerPrincipal(p);
  s.registerPrincipal({ id: 'manager-other', label: '다른 팀 책임자', role: 'manager', teamId: 'other-team' });
  t.after(() => s.close());
  const p = s.createProject('customer-a', { requestId: id(), title: '시험 창업 사업' });
  const c = s.saveCandidate('customer-a', p.id, null, { requestId: id(), name: '후보지 가', address: '시험용 주소', areaSqm: '', priceWon: 0, memo: '최초 후보지 자료' }).project.candidates[0];
  const input = { requestId: id(), candidateId: c.id, version: c.version, consent: true, question: '창업 가능성을 사전 검토해 주세요.' };
  const q = s.submit('customer-a', p.id, input);
  const assign = (actorId = 'staff-a') => s.assign('manager', p.id, { requestId: id(), version: s.project('manager', p.id).version, assigneeId: actorId, reason: '시험 배정 사유' });
  const act = (actorId, action, body = {}) => s.act(actorId, q.id, action, { requestId: id(), version: s.inquiry(actorId, q.id).version, body: '시험 업무 기록', ...body });
  return { s, p, c, q, input, assign, act };
}

test('A01: customer registers, manager assigns, staff replies, same identity sees persisted result', t => {
  const { s, p, q, assign, act } = fixture(t);
  assert.equal(s.listProjects('staff-a').length, 0);
  assign(); act('staff-a', 'transition', { status: 'reviewing' });
  const replied = act('staff-a', 'reply', { body: '회신을 참고하고 현장을 추가 확인하세요.', ...proof });
  assert.equal(replied.status, 'answered');
  const viewed = s.project('customer-a', p.id).inquiries[0];
  assert.equal(viewed.receipt, q.receipt); assert.equal(viewed.messages.length, 1);
  assert.equal(viewed.messages[0].checkedBy, proof.checkedBy);
});
test('A02 A03 A05 A06: ownership, team scope and receipt cannot be forged', t => {
  const { s, p, c, q } = fixture(t);
  for (const actor of ['customer-b', 'staff-a', 'staff-b', 'manager-other']) {
    expectError(() => s.project(actor, p.id), 404);
    expectError(() => s.inquiry(actor, q.id), 404);
    expectError(() => s.saveCandidate(actor, p.id, c.id, { requestId: id(), version: c.version, name: '공격', address: '위조' }), 404);
  }
  expectError(() => s.inquiry('customer-b', q.receipt), 404);
  assert.equal(s.listProjects('customer-b').length, 0);
  const forged = s.createProject('customer-b', { requestId: id(), title: '내 사업', ownerId: 'customer-a', role: 'manager', assigneeId: 'staff-a' });
  expectError(() => s.project('customer-a', forged.id), 404);
});
test('candidate input: missing differs from zero; bad units, negatives and unsafe URLs rejected', t => {
  const { s, p, c } = fixture(t);
  assert.equal(c.areaSqm, null); assert.equal(c.priceWon, 0);
  for (const extra of [{ priceWon: -1 }, { areaSqm: '5평' }, { priceWon: Number.MAX_SAFE_INTEGER + 1 }, { listingUrl: 'javascript:alert(1)' }, { areaSqm: [] }]) {
    expectError(() => s.saveCandidate('customer-a', p.id, null, { requestId: id(), name: '후보', address: '주소', ...extra }), 400);
  }
  assert.equal(s.project('customer-a', p.id).candidates.length, 1);
});
test('A07 A08: retried submission returns original receipt and rejects different contents', t => {
  const { s, p, q, input } = fixture(t);
  assert.equal(s.submit('customer-a', p.id, input).receipt, q.receipt);
  expectError(() => s.submit('customer-a', p.id, { ...input, question: '다른 질문' }), 409, 'IDEMPOTENCY_CONFLICT');
  assert.equal(s.project('customer-a', p.id).inquiries.length, 1);
});
test('project and candidate creation use durable submission keys too', t => {
  const { s } = fixture(t);
  const payload = { requestId: id(), title: '재시도 사업' };
  const first = s.createProject('customer-b', payload), second = s.createProject('customer-b', payload);
  assert.equal(first.id, second.id);
  const candidate = { requestId: id(), name: '새 후보', address: '새 주소' };
  assert.equal(s.saveCandidate('customer-b', first.id, null, candidate).candidateId, s.saveCandidate('customer-b', first.id, null, candidate).candidateId);
  assert.equal(s.project('customer-b', first.id).candidates.length, 1);
});
test('A24 A14: stale candidate writes fail; hold and new candidates preserve submitted snapshot', t => {
  const { s, p, c, q } = fixture(t);
  const edited = { requestId: id(), version: c.version, name: '후보지 수정', address: '변경 주소', memo: '새 메모', lifecycle: 'rejected' };
  s.saveCandidate('customer-a', p.id, c.id, edited);
  expectError(() => s.saveCandidate('customer-a', p.id, c.id, { ...edited, requestId: id(), memo: '오래된 덮어쓰기' }), 409, 'VERSION_CONFLICT');
  s.saveCandidate('customer-a', p.id, null, { requestId: id(), name: '대체 후보', address: '대체 주소', lifecycle: 'selected' });
  const viewed = s.project('customer-a', p.id);
  assert.equal(viewed.candidates.length, 2); assert.equal(viewed.candidates[0].lifecycle, 'rejected');
  assert.equal(s.inquiry('customer-a', q.id).snapshot.memo, '최초 후보지 자료');
  assert.equal(s.inquiry('customer-a', q.id).candidateVersion, 1);
});
test('A10: only scoped manager can assign; staff cannot claim the unassigned queue', t => {
  const { s, p, assign } = fixture(t);
  expectError(() => s.assign('customer-a', p.id, { requestId: id() }), 403);
  expectError(() => s.assign('staff-a', p.id, { requestId: id() }), 404);
  expectError(() => s.staffList('staff-a'), 403);
  expectError(() => s.assign('manager', p.id, { requestId: id(), version: 1, assigneeId: 'customer-b', reason: '위조' }), 400);
  assign();
  expectError(() => s.assign('staff-a', p.id, { requestId: id() }), 403);
  assert.equal(s.project('manager', p.id).assignmentHistory.length, 1);
});
test('A11: reassignment revokes prior staff reads, mutations and cached retry paths', t => {
  const { s, p, q, assign } = fixture(t); assign();
  const input = { requestId: id(), version: q.version, status: 'reviewing', body: '검토 시작' };
  s.act('staff-a', q.id, 'transition', input);
  assign('staff-b');
  expectError(() => s.project('staff-a', p.id), 404);
  expectError(() => s.act('staff-a', q.id, 'transition', input), 404);
  expectError(() => s.act('staff-a', q.id, 'note', { requestId: id(), version: 2, body: '권한 회수 후 메모' }), 404);
  assert.equal(s.listProjects('staff-a').length, 0); assert.equal(s.listProjects('staff-b').length, 1);
  assert.equal(s.inquiry('staff-b', q.id).status, 'reviewing');
});
test('A13: allowed state transitions, public reasons and reopening preserve original receipt', t => {
  const { s, q, assign, act } = fixture(t); assign();
  expectError(() => act('staff-a', 'transition', { status: 'answered' }), 409, 'INVALID_TRANSITION');
  expectError(() => act('customer-a', 'transition', { status: 'closed' }), 403);
  expectError(() => act('staff-a', 'transition', { status: 'hold', body: '' }), 400);
  act('staff-a', 'transition', { status: 'hold', body: '도로 확인을 기다립니다.' });
  let current = act('customer-a', 'followup', { body: '도로 자료를 추가했습니다.' });
  assert.equal(current.receipt, q.receipt); assert.equal(current.status, 'reopened');
  act('staff-a', 'transition', { status: 'more_info' });
  current = act('customer-a', 'additional', { body: '요청받은 자료 내용입니다.' });
  assert.equal(current.status, 'reviewing');
  act('staff-a', 'reply', { ...proof });
  act('staff-a', 'transition', { status: 'closed' });
  current = act('customer-a', 'followup');
  assert.equal(current.status, 'reopened'); assert.equal(current.receipt, q.receipt);
  assert.equal(current.messages.filter(m => m.kind === 'reply').length, 1);
});
test('A16: review evidence, unknown fields and correction history remain distinct', t => {
  const { s, q, assign, act } = fixture(t); assign(); act('staff-a', 'transition', { status: 'reviewing' });
  const before = s.inquiry('customer-a', q.id);
  expectError(() => act('staff-a', 'review', { item: 'land', state: 'recorded' }), 400);
  expectError(() => act('staff-a', 'review', { item: 'land', state: 'possible', ...proof }), 400);
  assert.equal(s.inquiry('customer-a', q.id).version, before.version);
  act('staff-a', 'review', { item: 'land', state: 'unreviewed', ...proof });
  let current = s.inquiry('customer-a', q.id); assert.equal(current.reviews[0].checkedAt, ''); assert.equal(current.reviews[0].checkedBy, '');
  act('staff-a', 'review', { item: 'land', state: 'recorded', ...proof });
  act('staff-a', 'review', { item: 'land', state: 'needs_review', ...proof, source: '정정 근거', body: '후속 자료 검토 필요' });
  current = s.inquiry('customer-a', q.id); assert.equal(current.reviews.length, 3); assert.equal(current.reviews[1].source, proof.source);
});
test('public answer corrections append a version and keep original content', t => {
  const { s, q, assign, act } = fixture(t); assign(); act('staff-a', 'transition', { status: 'reviewing' });
  const first = act('staff-a', 'reply', { ...proof, body: '최초 공개 답변' });
  const corrected = act('staff-a', 'reply', { ...proof, body: '정정된 공개 답변', supersedes: first.messages[0].id, reason: '추가 회신 반영' });
  assert.equal(corrected.messages[0].body, '최초 공개 답변'); assert.equal(corrected.messages[1].supersedes, first.messages[0].id);
  assert.equal(s.inquiry('customer-a', q.id).events.at(-1).correctionReason, '추가 회신 반영');
});
test('A12: notes and private events never enter customer serialization', t => {
  const { s, p, q, assign, act } = fixture(t); assign();
  act('staff-a', 'note', { body: 'INTERNAL-ONLY-SENTINEL' });
  const staff = JSON.stringify(s.project('staff-a', p.id)); assert(staff.includes('INTERNAL-ONLY-SENTINEL'));
  const customer = JSON.stringify(s.project('customer-a', p.id)); assert(!customer.includes('INTERNAL-ONLY-SENTINEL')); assert(!customer.includes('assignmentHistory')); assert(!customer.includes('시험 배정 사유'));
  assert.equal(s.inquiry('customer-a', q.id).events.length, 1);
});
test('A04 A11 A12: file access checks owner, visibility and current assignment on every request', t => {
  const { s, q, assign } = fixture(t); assign();
  let current = s.attach('staff-a', q.id, { requestId: id(), version: q.version, name: '내부.png', mime: 'image/png', data: png, visibility: 'internal' });
  const privateId = current.attachments[0].id;
  expectError(() => s.attachment('customer-a', privateId), 404);
  assert.equal(s.inquiry('customer-a', q.id).attachments.length, 0);
  current = s.attach('customer-a', q.id, { requestId: id(), version: current.version, name: '현장.png', mime: 'image/png', data: png });
  const publicId = current.attachments[0].id;
  assert(s.attachment('customer-a', publicId).data.length > 20);
  expectError(() => s.attachment('customer-b', publicId), 404);
  assign('staff-b');
  expectError(() => s.attachment('staff-a', privateId), 404); expectError(() => s.attachment('staff-a', publicId), 404);
  assert.equal(s.attachment('staff-b', privateId).mime, 'image/png');
});
test('file validation rejects HTML, invalid MIME, over-limit bytes and private customer uploads', t => {
  const { s, q } = fixture(t);
  for (const value of [
    { mime: 'image/png', data: Buffer.from('<script>bad</script>').toString('base64') },
    { mime: 'text/html', data: png }, { mime: 'image/png', data: '!!!!' },
    { mime: 'image/png', data: Buffer.concat([Buffer.from(png, 'base64'), Buffer.alloc(2_000_001)]).toString('base64') },
  ]) expectError(() => s.attach('customer-a', q.id, { requestId: id(), version: q.version, name: 'test.png', ...value }), 400);
  expectError(() => s.attach('customer-a', q.id, { requestId: id(), version: q.version, name: 'test.png', mime: 'image/png', data: png, visibility: 'internal' }), 403);
  assert.equal(s.inquiry('customer-a', q.id).attachments.length, 0);
});
test('attachment retries do not create duplicate files or events', t => {
  const { s, q } = fixture(t);
  const input = { requestId: id(), version: q.version, name: '현장.png', mime: 'image/png', data: png };
  const first = s.attach('customer-a', q.id, input), retried = s.attach('customer-a', q.id, input);
  assert.equal(first.attachments[0].id, retried.attachments[0].id); assert.equal(retried.attachments.length, 1); assert.equal(retried.events.length, 2);
});
test('A22 A23: stale state and answer requests do not duplicate or overwrite', t => {
  const { s, q, assign } = fixture(t); assign();
  s.act('staff-a', q.id, 'transition', { requestId: id(), version: 1, status: 'reviewing', body: '시작' });
  expectError(() => s.act('staff-a', q.id, 'transition', { requestId: id(), version: 1, status: 'hold', body: '늦은 요청' }), 409, 'VERSION_CONFLICT');
  const input = { requestId: id(), version: 2, body: '최종 시험 답변', ...proof };
  const first = s.act('staff-a', q.id, 'reply', input);
  assert.equal(s.act('staff-a', q.id, 'reply', input).messages.length, 1);
  expectError(() => s.act('staff-a', q.id, 'reply', { ...input, requestId: id() }), 409, 'VERSION_CONFLICT');
  expectError(() => s.act('staff-a', q.id, 'reply', { ...input, body: '변경 공격' }), 409, 'IDEMPOTENCY_CONFLICT');
  assert.equal(first.messages[0].body, s.inquiry('customer-a', q.id).messages[0].body);
});
test('failed multi-record change rolls back messages, versions and events together', t => {
  const { s, q, assign, act } = fixture(t); assign();
  const before = s.inquiry('manager', q.id);
  // This fails in event validation after note insertion and version bump.
  expectError(() => act('staff-a', 'note', { body: '중간에 실패할 기록', supersedes: id(), reason: '' }), 400);
  assert.deepEqual(s.inquiry('manager', q.id), before);
});
test('SQLite reopen preserves original receipt, revisions and retry key', t => {
  const directory = mkdtempSync(join(tmpdir(), 'workspace-durable-')); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'workspace.sqlite');
  let s = createWorkspaceStore(path); for (const p of demoPrincipals) s.registerPrincipal(p);
  const input = { requestId: id(), title: '재실행 보존 사업' }; const p = s.createProject('customer-a', input); s.close();
  s = createWorkspaceStore(path);
  try { assert.equal(s.createProject('customer-a', input).id, p.id); assert.equal(s.listProjects('customer-a').length, 1); } finally { s.close(); }
});
test('demo refuses implicit opt-in and production before creating any data', () => {
  assert.throws(() => createWorkspacePreview({ dataDir: '/tmp/not-created-workspace' }), /explicit opt-in/);
  assert.throws(() => createWorkspacePreview({ dataDir: '/tmp/not-created-workspace', demo: true, environment: 'production' }), /production/);
});

test('HTTP boundary: cookie identity, CSRF, lost response retry, parallel writes and revoked files', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'workspace-http-')); const app = createWorkspacePreview({ dataDir: directory, demo: true, environment: 'test' });
  const base = await app.listen();
  t.after(async () => { await new Promise(resolve => app.server.close(resolve)); rmSync(directory, { recursive: true, force: true }); });
  const cookies = {};
  async function login(who) { const r = await fetch(base + '/api/workspace/demo/actor', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actorId: who }) }); assert.equal(r.status, 200); cookies[who] = r.headers.get('set-cookie').split(';')[0]; }
  async function call(who, path, payload, extra = {}) {
    const response = await fetch(base + '/api/workspace/' + path, { headers: { ...(cookies[who] ? { cookie: cookies[who] } : {}), ...(payload ? { 'content-type': 'application/json' } : {}), ...extra }, ...(payload ? { method: 'POST', body: JSON.stringify(payload) } : {}) });
    return { response, payload: await response.json().catch(() => ({})) };
  }
  assert.equal((await call('none', 'projects')).response.status, 401);
  for (const who of ['customer-a','customer-b','manager','staff-a','staff-b']) await login(who);
  assert.equal((await call('customer-a', 'projects', { requestId: id(), title: '공격' }, { origin: 'https://evil.invalid' })).response.status, 403);
  const invalidHostStatus = await new Promise((resolve, reject) => {
    const req = httpRequest(base + '/api/workspace/demo', { headers: { host: 'evil.invalid' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(invalidHostStatus, 403);
  const original = app.server.listeners('request');
  app.server.on('request', (req, res) => { if (req.headers['x-drop-response'] === '1') res.end = () => { res.destroy(); }; });
  const input = { requestId: id(), title: '응답 유실 사업', ownerId: 'customer-b', role: 'manager' };
  await assert.rejects(() => call('customer-a', 'projects', input, { 'x-drop-response': '1' }));
  const p = (await call('customer-a', 'projects', input)).payload.project;
  assert.equal((await call('customer-a', 'projects')).payload.projects.length, 1);
  assert.equal((await call('customer-b', 'projects/' + p.id)).response.status, 404);
  const candidateInput = { requestId: id(), name: 'HTTP 후보지', address: '시험 주소' };
  const candidateResult = (await call('customer-a', `projects/${p.id}/candidates`, candidateInput)).payload;
  const c = candidateResult.project.candidates[0];
  const submitted = await Promise.all([1,2].map(() => call('customer-a', `projects/${p.id}/inquiries`, { requestId: 'same-parallel-submit', version: c.version, candidateId: c.id, question: '동시 제출', consent: true })));
  assert.equal(submitted[0].response.status, 200); assert.equal(submitted[1].response.status, 200);
  assert.equal(submitted[0].payload.inquiry.receipt, submitted[1].payload.inquiry.receipt);
  const q = submitted[0].payload.inquiry;
  assert.equal((await call('staff-a', 'projects/' + p.id)).response.status, 404);
  await call('manager', `projects/${p.id}/assignment`, { requestId: id(), version: 1, assigneeId: 'staff-a', reason: 'HTTP 배정' });
  const parallel = await Promise.all(['reviewing','hold'].map(status => call('staff-a', `inquiries/${q.id}/transition`, { requestId: id(), version: 1, status, body: '동시 상태 변경' })));
  assert.deepEqual(parallel.map(r => r.response.status).sort(), [200,409]);
  const current = (await call('customer-a', `inquiries/${q.id}`)).payload.inquiry;
  const uploaded = (await call('customer-a', `inquiries/${q.id}/attachments`, { requestId: id(), version: current.version, name: '시험.png', mime: 'image/png', data: png })).payload.inquiry;
  const attachment = uploaded.attachments[0].id;
  const fileBefore = await fetch(base + '/api/workspace/attachments/' + attachment, { headers: { cookie: cookies['staff-a'] } }); assert.equal(fileBefore.status, 200);
  await call('manager', `projects/${p.id}/assignment`, { requestId: id(), version: 2, assigneeId: 'staff-b', reason: '재배정' });
  const fileAfter = await fetch(base + '/api/workspace/attachments/' + attachment, { headers: { cookie: cookies['staff-a'] } }); assert.equal(fileAfter.status, 404);
  assert.equal((await call('customer-b', `inquiries/${q.receipt}`)).response.status, 404);
  assert.equal((await call('customer-a', 'legacy-link', { receipt: q.receipt })).response.status, 404);
  assert.equal(original.length, 1);
});
