import './permit.css';

const candidateStorageKey = 'sonsecha-candidates-v2';
const maxNoteLength = 1000;
const maxSourceLength = 600;
const statusLabels = {
  unconfirmed: '미확인',
  document: '자료 확인',
  authority: '기관 확인',
  review: '추가 검토',
};
const resultLabels = {
  possible: '가능(검토 여지)',
  'needs-confirmation': '확인 필요',
  difficult: '어려움',
};
const fieldLabels = {
  spaceType: '현재 공간 종류',
  buildingUse: '건축물대장상 주용도',
  buildingUnit: '해당 동·층·호',
  usableArea: '실제 사용할 면적',
  violation: '위반건축물 표시 여부',
  landUse: '용도지역·지구·구역',
  districtPlan: '지구단위계획·경관지구 등',
  wastewaterRoute: '공공하수도·오수관·우수관·처리 경로',
  wastewaterProof: '하수·폐수 확인 근거',
  existingWash: '기존 세차장 인수 여부',
  maxWastewater: '예상 일 최대 폐수량',
  treatmentPath: '폐수 처리 경로',
  substance: '성분 확인 여부',
  authority: '기관 확인 기록',
};
const questionDefinitions = [
  { id: 'spaceType', title: '현재 건물 종류는 무엇인가요?', help: '건물 이름과 건축물대장상 용도는 다를 수 있습니다.', type: 'select', options: [['unknown', '모름'], ['warehouse', '창고'], ['factory', '공장'], ['parking', '주차장'], ['retail', '상가 1층'], ['existing-wash', '기존 세차장'], ['other', '기타 기존 건물'], ['vacant', '나대지']] },
  { id: 'building', title: '건축물대장상 용도와 실제 사용할 공간은 무엇인가요?', help: '해당 동·층·호와 실제 사용할 면적을 함께 기록하세요.', fields: [{ id: 'buildingUse', label: '주용도', type: 'text' }, { id: 'buildingUnit', label: '동·층·호', type: 'text' }, { id: 'usableArea', label: '실사용 면적', type: 'text' }] },
  { id: 'violation', title: '위반건축물 표시가 있나요?', help: '확인하지 못했다면 모름으로 두고 확인 질문을 남깁니다.', type: 'select', options: [['unknown', '모름'], ['yes', '표시 있음'], ['no', '표시 없음']] },
  { id: 'landUse', title: '용도지역·지구·구역은 무엇인가요?', help: '토지이음에서 직접 확인하고 출처와 확인일을 남깁니다.', fields: [{ id: 'landUse', label: '용도지역·지구·구역', type: 'text' }, { id: 'districtPlan', label: '지구단위계획·경관지구 등', type: 'text' }] },
  { id: 'wastewater', title: '물은 어느 관로로 나가나요?', help: '배수구가 있다는 사실과 적법한 폐수 처리 경로는 별도로 확인해야 합니다.', fields: [{ id: 'wastewaterRoute', label: '배출·연결 경로', type: 'select', options: [['unknown', '모름'], ['public-sewer', '공공하수도 연결'], ['sewer-waste', '오수관'], ['rainwater', '우수관으로 배출 계획'], ['private', '개인처리시설'], ['outsourced', '위탁 처리'], ['other', '기타']] }, { id: 'wastewaterProof', label: '확인 근거', type: 'text' }] },
  { id: 'existingWash', title: '기존 세차장을 인수·계속 사용하는 건가요?', help: '양수·임차·기존 영업 계속과 시설 변경은 서로 다를 수 있습니다.', type: 'select', options: [['unknown', '모름'], ['new', '신규 전환'], ['transfer', '시설 양수'], ['lease', '임차'], ['continue', '기존 영업 계속']] },
  { id: 'wastewaterDetail', title: '폐수량·처리 경로·성분을 확인했나요?', help: '물 사용량을 폐수량으로 자동 간주하지 않습니다.', fields: [{ id: 'maxWastewater', label: '예상 일 최대 폐수량·단위', type: 'text' }, { id: 'treatmentPath', label: '처리 경로', type: 'text' }, { id: 'substance', label: '성분 확인', type: 'select', options: [['unknown', '모름'], ['yes', '확인함'], ['no', '없다고 추정']] }] },
  { id: 'authority', title: '기관에서 확인받은 내용이 있나요?', help: '고객이 기록한 회신은 기관 시스템의 인증 결과가 아닙니다.', type: 'textarea', fields: [{ id: 'authority', label: '기관·부서·확인일·회신 요지', type: 'textarea' }] },
];

const form = document.querySelector('#permitForm');
const panels = [...document.querySelectorAll('[data-panel]')];
const saveState = document.querySelector('[data-save-state]');
const currentStep = document.querySelector('[data-current-step]');
const stepTitle = document.querySelector('[data-step-title]');
const candidateList = document.querySelector('[data-candidate-list]');
const questionList = document.querySelector('[data-question-list]');
const labels = ['후보지 선택과 기본 정보', '허가 질문', '결과 확인'];
let candidateState = loadCandidateState();
let activeStep = 1;
let saveTimer;

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultPermit() {
  return { schemaVersion: 1, updatedAt: '', questions: {}, result: { status: 'needs-confirmation', reason: '', updatedAt: '' } };
}

function normalizeCandidate(candidate) {
  const safe = candidate && typeof candidate === 'object' ? candidate : {};
  return {
    ...safe,
    id: typeof safe.id === 'string' && safe.id ? safe.id : makeId(),
    name: typeof safe.name === 'string' ? safe.name : '',
    address: typeof safe.address === 'string' ? safe.address : '',
    permit: safe.permit && typeof safe.permit === 'object' ? safe.permit : defaultPermit(),
  };
}

function loadCandidateState() {
  try {
    const raw = JSON.parse(localStorage.getItem(candidateStorageKey) || '{}');
    if (Array.isArray(raw.candidates) && raw.candidates.length) {
      const candidates = raw.candidates.map(normalizeCandidate);
      return { candidates, activeId: candidates.some((item) => item.id === raw.activeId) ? raw.activeId : candidates[0].id };
    }
  } catch { /* fall through to a new local candidate */ }
  const candidate = normalizeCandidate({ name: '후보지 1' });
  return { candidates: [candidate], activeId: candidate.id };
}

function activeCandidate() {
  return candidateState.candidates.find((candidate) => candidate.id === candidateState.activeId) || candidateState.candidates[0];
}

function saveCandidateState(message = '저장됨 ✓') {
  try {
    localStorage.setItem(candidateStorageKey, JSON.stringify(candidateState));
    saveState.textContent = message;
    saveState.classList.remove('error');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveState.textContent = '이 기기에만 저장'; }, 1400);
    return true;
  } catch (error) {
    saveState.textContent = '저장하지 못했습니다. 요약을 내려받아 보관하세요.';
    saveState.classList.add('error');
    return false;
  }
}

function permitFor(candidate) {
  if (!candidate.permit || typeof candidate.permit !== 'object') candidate.permit = defaultPermit();
  if (!candidate.permit.questions || typeof candidate.permit.questions !== 'object') candidate.permit.questions = {};
  return candidate.permit;
}

function questionRecord(candidate, id) {
  const permit = permitFor(candidate);
  const current = permit.questions[id];
  if (!current || typeof current !== 'object') permit.questions[id] = { values: {}, status: 'unconfirmed', checkedAt: '', sourceUrl: '', memo: '' };
  const record = permit.questions[id];
  if (!record.values || typeof record.values !== 'object') record.values = {};
  if (!Object.prototype.hasOwnProperty.call(statusLabels, record.status)) record.status = 'unconfirmed';
  if (typeof record.memo !== 'string') record.memo = '';
  if (typeof record.sourceUrl !== 'string') record.sourceUrl = '';
  if (typeof record.checkedAt !== 'string') record.checkedAt = '';
  return record;
}

function questionValue(candidate, field) {
  const definition = questionDefinitions.find((question) => question.id === field || question.fields?.some((item) => item.id === field));
  if (field === 'spaceType') return document.querySelector('[name="spaceType"]')?.value || 'unknown';
  const record = questionRecord(candidate, definition?.id || field);
  return record.values[field] || '';
}

function setFieldValue(candidate, field, value) {
  if (field === 'spaceType') {
    candidate.permit.spaceType = value;
    document.querySelectorAll('[name="spaceType"]').forEach((input) => { input.value = value; });
    return;
  }
  const definition = questionDefinitions.find((question) => question.fields?.some((item) => item.id === field));
  const record = questionRecord(candidate, definition?.id || field);
  record.values[field] = String(value).slice(0, field === 'authority' ? maxNoteLength : maxSourceLength);
  document.querySelectorAll(`[data-permit-input="${field}"]`).forEach((input) => { input.value = record.values[field]; });
}

function syncBasicFields(candidate) {
  const permit = permitFor(candidate);
  document.querySelector('[name="candidateName"]').value = candidate.name || '';
  document.querySelector('[name="candidateAddress"]').value = candidate.address || '';
  document.querySelector('[name="washType"]').value = permit.washType || 'unknown';
  document.querySelector('[name="spaceType"]').value = permit.spaceType || 'unknown';
}

function renderCandidates() {
  candidateList.innerHTML = candidateState.candidates.map((candidate, index) => {
    const active = candidate.id === candidateState.activeId;
    return `<button type="button" class="permit-candidate-button${active ? ' active' : ''}" data-candidate-id="${escapeHtml(candidate.id)}" aria-current="${active ? 'true' : 'false'}"><strong>${escapeHtml(candidate.name.trim() || `후보지 ${index + 1}`)}</strong><small>${escapeHtml(candidate.address.trim() || '주소 미입력')}</small></button>`;
  }).join('');
  candidateList.querySelectorAll('[data-candidate-id]').forEach((button) => button.addEventListener('click', () => {
    candidateState.activeId = button.dataset.candidateId;
    saveCandidateState('후보지 선택 저장됨 ✓');
    renderAll();
  }));
}

function inputMarkup(field, label, type = 'text', options = []) {
  if (type === 'textarea') return `<label class="permit-question-label permit-question-wide"><span>${escapeHtml(label)}</span><textarea data-permit-input="${escapeHtml(field)}" maxlength="${maxNoteLength}" rows="4"></textarea></label>`;
  if (type === 'select') return `<label class="permit-question-label"><span>${escapeHtml(label)}</span><select data-permit-input="${escapeHtml(field)}">${options.map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`).join('')}</select></label>`;
  return `<label class="permit-question-label"><span>${escapeHtml(label)}</span><input type="text" maxlength="${maxSourceLength}" data-permit-input="${escapeHtml(field)}"></label>`;
}

function renderQuestions() {
  questionList.innerHTML = questionDefinitions.map((definition) => {
    const fields = definition.fields || [{ id: definition.id, label: fieldLabels[definition.id] || definition.title, type: definition.type, options: definition.options }];
    return `<article class="permit-question" data-question-card="${definition.id}"><div class="permit-question-head"><div><h3>${escapeHtml(definition.title)}</h3><p class="permit-question-help">${escapeHtml(definition.help)}</p></div><span class="permit-status-badge" data-status-badge="${definition.id}">미확인</span></div><div class="permit-question-grid">${fields.map((field) => inputMarkup(field.id, field.label, field.type, field.options)).join('')}</div><div class="permit-question-meta"><label class="permit-question-label"><span>확인 상태</span><select data-question-status="${definition.id}"><option value="unconfirmed">미확인</option><option value="document">자료 확인</option><option value="authority">기관 확인</option><option value="review">추가 검토</option></select></label><label class="permit-question-label"><span>확인일</span><input type="date" data-question-date="${definition.id}"></label><label class="permit-question-label permit-question-wide"><span>출처 URL</span><input type="url" maxlength="${maxSourceLength}" data-question-source="${definition.id}" placeholder="https://"></label><label class="permit-question-label permit-question-wide"><span>근거 메모</span><textarea data-question-memo="${definition.id}" maxlength="${maxNoteLength}" rows="3" placeholder="확인한 내용·담당 부서·남은 질문을 적어두세요."></textarea></label></div></article>`;
  }).join('');
}

function renderQuestionValues() {
  const candidate = activeCandidate();
  const permit = permitFor(candidate);
  document.querySelectorAll('[data-permit-input]').forEach((input) => {
    const value = input.dataset.permitInput === 'spaceType' ? (permit.spaceType || 'unknown') : questionValue(candidate, input.dataset.permitInput);
    input.value = value;
  });
  questionDefinitions.forEach((definition) => {
    const record = questionRecord(candidate, definition.id);
    const badge = document.querySelector(`[data-status-badge="${definition.id}"]`);
    const status = record.status;
    if (badge) { badge.textContent = statusLabels[status]; badge.dataset.status = status; }
    const statusSelect = document.querySelector(`[data-question-status="${definition.id}"]`);
    const dateInput = document.querySelector(`[data-question-date="${definition.id}"]`);
    const sourceInput = document.querySelector(`[data-question-source="${definition.id}"]`);
    const memoInput = document.querySelector(`[data-question-memo="${definition.id}"]`);
    if (statusSelect) statusSelect.value = status;
    if (dateInput) dateInput.value = record.checkedAt;
    if (sourceInput) sourceInput.value = record.sourceUrl;
    if (memoInput) memoInput.value = record.memo;
  });
}

function updateQuestionStatus(id, status) {
  const record = questionRecord(activeCandidate(), id);
  record.status = Object.prototype.hasOwnProperty.call(statusLabels, status) ? status : 'unconfirmed';
  const badge = document.querySelector(`[data-status-badge="${id}"]`);
  if (badge) { badge.textContent = statusLabels[record.status]; badge.dataset.status = record.status; }
  permitFor(activeCandidate()).updatedAt = new Date().toISOString();
  saveCandidateState();
}

function statusFor(id) {
  return questionRecord(activeCandidate(), id).status;
}

function answerText(id) {
  const record = questionRecord(activeCandidate(), id);
  return Object.values(record.values).map((value) => String(value || '').trim()).filter(Boolean).join(' · ');
}

function buildResult() {
  const candidate = activeCandidate();
  const permit = permitFor(candidate);
  const missing = [];
  const difficult = [];
  const nextQuestions = [];
  questionDefinitions.forEach((definition) => {
    const record = questionRecord(candidate, definition.id);
    const answer = definition.id === 'spaceType' ? (permit.spaceType || 'unknown') : answerText(definition.id);
    if (record.status === 'unconfirmed' || !answer || answer === 'unknown') missing.push(definition.title);
    if (record.status === 'review') nextQuestions.push(`${definition.title} — 추가 검토`);
    if (definition.id === 'wastewater' && record.values.wastewaterRoute === 'rainwater') difficult.push('우수관 직방류 계획은 먼저 관할 하수·환경 담당 기관과 처리계획을 확인해야 합니다.');
    if (definition.id === 'wastewater' && record.values.wastewaterRoute === 'unknown' && record.status === 'review') difficult.push('배출 경로와 처리계획이 확인되지 않았습니다.');
  });
  const authorityRecords = questionRecord(candidate, 'authority');
  const hasAuthority = authorityRecords.status === 'authority' && Boolean(answerText('authority'));
  if (!hasAuthority) nextQuestions.push('관할 건축·도시계획·환경·하수 담당 기관의 확인일과 회신 요지를 기록하세요.');
  const status = difficult.length ? 'difficult' : (missing.length || nextQuestions.length ? 'needs-confirmation' : 'possible');
  let reason = difficult.length ? difficult.join(' ') : (missing.length ? `${missing.length}개 질문이 미확인 상태입니다.` : '입력한 자료와 기록상 추가 장애가 표시되지 않았습니다.');
  if (status === 'possible') reason = '필요한 입력과 근거가 기록된 상태입니다. 가능(검토 여지)은 허가 완료를 뜻하지 않습니다.';
  const result = { status, reason, missing, nextQuestions, updatedAt: new Date().toISOString() };
  permit.result = result;
  permit.updatedAt = result.updatedAt;
  saveCandidateState();
  return result;
}

function renderResult() {
  const result = buildResult();
  const card = document.querySelector('[data-result-card]');
  const candidate = activeCandidate();
  const list = (items, empty) => items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : `<p class="permit-result-copy">${escapeHtml(empty)}</p>`;
  card.innerHTML = `<div class="permit-result-status" data-result="${result.status}"><span class="permit-status-badge" data-status="${result.status}">${resultLabels[result.status]}</span><h3>${escapeHtml(candidate.name || '현재 후보지')}</h3></div><p class="permit-result-copy">${escapeHtml(result.reason)}</p><div class="permit-result-columns"><div class="permit-result-block"><h4>미확인·장애 사유</h4>${list(result.missing.concat(result.status === 'difficult' ? ['현재 조건은 기관 확인·계획 보완이 우선입니다.'] : []), '표시할 미확인 항목이 없습니다.')}</div><div class="permit-result-block"><h4>다음 기관 질문</h4>${list(result.nextQuestions, '추가로 표시된 기관 질문이 없습니다.')}</div></div><div class="permit-authority-warning"><strong>최종 확인은 관할 기관</strong><br>이 결과는 고객 입력과 기록을 정리한 일차 안내이며 법률 자문·허가 완료·공사 착수 승인이 아닙니다.</div>`;
}

function setStep(step) {
  activeStep = step;
  panels.forEach((panel) => { panel.hidden = Number(panel.dataset.panel) !== step; });
  currentStep.textContent = String(step);
  stepTitle.textContent = labels[step - 1];
  document.querySelectorAll('[data-step-indicator]').forEach((indicator) => indicator.classList.toggle('active', Number(indicator.dataset.stepIndicator) === step));
  if (step === 1) { renderCandidates(); syncBasicFields(activeCandidate()); }
  if (step === 2) { renderQuestions(); renderQuestionValues(); }
  if (step === 3) renderResult();
  window.scrollTo({ top: document.querySelector('.permit-shell').offsetTop - 18, behavior: 'smooth' });
}

function renderAll() {
  renderCandidates();
  syncBasicFields(activeCandidate());
  if (activeStep === 2) { renderQuestions(); renderQuestionValues(); }
  if (activeStep === 3) renderResult();
}

function summaryText() {
  const candidate = activeCandidate();
  const result = candidate.permit?.result || buildResult();
  const lines = [`손세차장 허가 확인 준비 요약`, `후보지: ${candidate.name || '미입력'}`, `주소: ${candidate.address || '미입력'}`, `결과: ${resultLabels[result.status] || result.status}`, `사유: ${result.reason}`, '', '미확인·장애 사유:', ...(result.missing || []).map((item) => `- ${item}`), '', '다음 기관 질문:', ...(result.nextQuestions || []).map((item) => `- ${item}`), '', '최종 확인은 관할 기관입니다.', '이 문서는 법률 자문이나 허가 완료를 의미하지 않습니다.'];
  return lines.join('\n');
}

function downloadSummary() {
  const blob = new Blob([summaryText()], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); link.download = 'permit-check-summary.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

document.querySelector('[data-new-candidate]').addEventListener('click', () => {
  const candidate = normalizeCandidate({ name: `후보지 ${candidateState.candidates.length + 1}` });
  candidateState.candidates.push(candidate); candidateState.activeId = candidate.id; saveCandidateState('새 후보지 저장됨 ✓'); renderAll();
});

document.querySelector('[name="candidateName"]').addEventListener('input', (event) => { activeCandidate().name = event.target.value.slice(0, 120); saveCandidateState(); renderCandidates(); });
document.querySelector('[name="candidateAddress"]').addEventListener('input', (event) => { activeCandidate().address = event.target.value.slice(0, 300); saveCandidateState(); renderCandidates(); });
document.querySelector('[name="washType"]').addEventListener('change', (event) => { permitFor(activeCandidate()).washType = event.target.value; saveCandidateState(); });
document.querySelector('[name="spaceType"]').addEventListener('change', (event) => { setFieldValue(activeCandidate(), 'spaceType', event.target.value); saveCandidateState(); });

form.addEventListener('input', (event) => {
  const input = event.target;
  if (!input.matches('[data-permit-input]')) return;
  setFieldValue(activeCandidate(), input.dataset.permitInput, input.value);
  saveCandidateState();
});
form.addEventListener('change', (event) => {
  const input = event.target;
  const candidate = activeCandidate();
  if (input.matches('[data-permit-input]')) { setFieldValue(candidate, input.dataset.permitInput, input.value); saveCandidateState(); return; }
  const statusId = input.dataset.questionStatus;
  const dateId = input.dataset.questionDate;
  const sourceId = input.dataset.questionSource;
  const memoId = input.dataset.questionMemo;
  if (statusId) updateQuestionStatus(statusId, input.value);
  if (dateId || sourceId || memoId) {
    const id = dateId || sourceId || memoId;
    const record = questionRecord(candidate, id);
    if (dateId) record.checkedAt = input.value;
    if (sourceId) record.sourceUrl = input.value.slice(0, maxSourceLength);
    if (memoId) record.memo = input.value.slice(0, maxNoteLength);
    saveCandidateState();
  }
});

document.querySelectorAll('[data-next]').forEach((button) => button.addEventListener('click', () => {
  if (Number(button.dataset.next) === 3) renderResult();
  setStep(Number(button.dataset.next));
}));
document.querySelectorAll('[data-prev]').forEach((button) => button.addEventListener('click', () => setStep(Number(button.dataset.prev))));
document.querySelector('[data-download]').addEventListener('click', downloadSummary);
document.querySelector('[data-print]').addEventListener('click', () => window.print());
document.querySelector('[data-consultation]').addEventListener('click', () => {
  localStorage.setItem(candidateStorageKey, JSON.stringify(candidateState));
  sessionStorage.setItem('sonsecha-open-consultation', '1');
  window.location.href = '/#top';
});

renderAll();
