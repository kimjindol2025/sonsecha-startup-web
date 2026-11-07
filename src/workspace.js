import { createBrowserWorkspace } from './workspace-browser-store.js';

const browserMode = !['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname) || new URLSearchParams(location.search).get('storage') === 'browser';
const browserWorkspace = browserMode ? createBrowserWorkspace() : null;

const $ = selector => document.querySelector(selector);
const app = $('#workspaceApp');
const dialog = $('#workspaceDialog');
const body = $('#dialogBody');
const status = $('#globalStatus');
const state = { actor: null, projects: [], project: null, projectId: null, inquiryId: null, staff: [] };
const lifecycleLabels = { reviewing: '검토 중', selected: '선정', hold: '보류', rejected: '탈락' };
const reviewLabels = { land: '용도지역·토지', building: '건축물 현황', water: '하수·폐수', access: '도로·진입' };
const reviewStates = { unreviewed: '미확인', checking: '확인 중', recorded: '확인 내용 있음', needs_review: '추가 검토 필요' };
const messageLabels = { reply: '공개 답변', followup: '고객 재문의', additional: '고객 추가자료', note: '내부 메모 · 고객 비공개' };
const e = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const date = value => value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '아직 저장하지 않음';
const money = value => value == null ? '미입력' : new Intl.NumberFormat('ko-KR').format(value) + '원';
let returnSelector = '#newProjectButton';
let refreshSequence = 0;
const pendingSubmissions = new Map();

async function api(path, payload) {
  if (browserWorkspace) return browserWorkspace.request(path, payload);
  let response;
  try { response = await fetch('/api/workspace/' + path, { credentials: 'same-origin', cache: 'no-store', ...(payload ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) } : {}) }); }
  catch { throw new Error('통신이 끊겼습니다. 입력은 유지되니 같은 내용으로 다시 시도해 주세요.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(result.error || '요청을 처리하지 못했습니다.'); error.status = response.status; error.code = result.code; throw error; }
  return result;
}
function announce(message, error = false) { status.textContent = message; status.classList.toggle('error', error); }
function field(name, label, value = '', { type = 'text', required = false, max = 160, help = '', wide = false } = {}) {
  return `<label class="field${wide ? ' wide' : ''}">${e(label)}${type === 'textarea' ? `<textarea name="${name}" maxlength="${max}" ${required ? 'required' : ''}>${e(value)}</textarea>` : `<input name="${name}" type="${type}" value="${e(value)}" ${['number'].includes(type) ? 'min="0" step="any"' : `maxlength="${max}"`} ${required ? 'required' : ''}>`}${help ? `<small>${e(help)}</small>` : ''}<span class="field-error"></span></label>`;
}
function select(name, label, options, value = '') {
  return `<label class="field">${e(label)}<select name="${name}">${Object.entries(options).map(([key, text]) => `<option value="${e(key)}" ${key === value ? 'selected' : ''}>${e(text)}</option>`).join('')}</select><span class="field-error"></span></label>`;
}
function evidenceFields() {
  return `${field('source', '근거·출처', '', { required: true, max: 2000, help: '문서명·공식 안내·담당기관 회신 등 실제 확인한 근거' })}<div class="field-grid">${field('checkedBy', '확인 주체', '', { required: true })}${field('checkedAt', '확인일', '', { type: 'date', required: true })}</div><label class="check-field"><input name="officialConfirmed" type="checkbox">관할 담당기관에 확인한 내용입니다.</label><label class="check-field"><input name="recheck" type="checkbox">추가 확인이 필요합니다.</label>${field('recheckReason', '재확인 사유', '', { max: 2000 })}`;
}
function formShell(contents, submit = '저장하기') {
  return `<form>${contents}<div class="form-error" role="alert" tabindex="-1"></div><p class="save-status" role="status" aria-live="polite">아직 저장하지 않았습니다.</p><div class="form-actions"><button type="button" data-close>취소</button><button type="submit" class="primary">${e(submit)}</button></div></form>`;
}
function modal(title, contents, trigger) {
  $('#dialogTitle').textContent = title;
  returnSelector = trigger?.id ? '#' + CSS.escape(trigger.id) : trigger?.dataset.action ? `[data-action="${trigger.dataset.action}"]${trigger.dataset.id ? `[data-id="${CSS.escape(trigger.dataset.id)}"]` : ''}` : '#newProjectButton';
  body.innerHTML = contents;
  dialog.showModal();
  dialog.querySelector('input:not([type=checkbox]),textarea,select')?.focus();
  body.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  body.querySelector('form')?.addEventListener('invalid', event => { event.target.setAttribute('aria-invalid', 'true'); const error = event.target.closest('.field')?.querySelector('.field-error'); if (error) error.textContent = event.target.validationMessage; }, true);
  body.querySelector('form')?.addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); const error = event.target.closest('.field')?.querySelector('.field-error'); if (error) error.textContent = ''; if (event.target.name === 'recheck') body.querySelector('[name=recheckReason]').required = event.target.checked; });
}
function restoreDialogFocus() {
  const target = document.querySelector(returnSelector);
  if (target && !target.hidden) target.focus({ preventScroll: true });
  else $('#workspaceMain').focus({ preventScroll: true });
}
$('#closeDialog').addEventListener('click', () => { if (dialog.dataset.saving !== 'true') dialog.close(); });
dialog.addEventListener('cancel', event => { if (dialog.dataset.saving === 'true') event.preventDefault(); });
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
  const first = focusable[0], last = focusable.at(-1);
  if (!first) { event.preventDefault(); dialog.focus(); return; }
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last) || !dialog.contains(document.activeElement)) {
    event.preventDefault(); (event.shiftKey ? last : first).focus();
  }
});
dialog.addEventListener('close', restoreDialogFocus);

// Only opaque submission IDs and content hashes are kept; no draft bodies or contacts.
async function execute(operation, target, payload) {
  const key = `workspace-submit:${state.actor.id}:${operation}:${target}`;
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload))))].map(b => b.toString(16).padStart(2, '0')).join('');
  let previous = pendingSubmissions.get(key) || null;
  try { const saved = JSON.parse(sessionStorage.getItem(key) || 'null'); if (saved) previous = saved; } catch { /* storage may be unavailable */ }
  if (previous && previous.hash !== hash) {
    const error = new Error('이전 제출의 응답을 아직 확인하지 못했습니다. 기존 내용으로 재시도하거나 창업 진행판에서 접수 결과를 먼저 확인해 주세요.'); error.code = 'PENDING_SUBMISSION'; throw error;
  }
  const requestId = previous?.requestId || crypto.randomUUID();
  pendingSubmissions.set(key, { hash, requestId });
  try { sessionStorage.setItem(key, JSON.stringify({ hash, requestId })); } catch { /* in-memory form ID still prevents repeated clicks */ }
  try {
    const result = await api(operation, { ...payload, requestId });
    pendingSubmissions.delete(key);
    try { sessionStorage.removeItem(key); } catch { /* optional storage */ }
    return result;
  } catch (error) {
    if (error.status && error.status < 500) { pendingSubmissions.delete(key); try { sessionStorage.removeItem(key); } catch { /* optional storage */ } }
    throw error;
  }
}
async function refresh() {
  const sequence = ++refreshSequence;
  const { projects } = await api('projects');
  if (sequence !== refreshSequence) return;
  state.projects = projects;
  if (!projects.some(p => p.id === state.projectId)) state.projectId = projects[0]?.id || null;
  const project = state.projectId ? (await api(`projects/${state.projectId}`)).project : null;
  if (sequence !== refreshSequence) return;
  state.project = project;
  if (!project?.inquiries.some(q => q.id === state.inquiryId)) state.inquiryId = project?.inquiries[0]?.id || null;
  render();
}
function conflictHelp(form, payload) {
  const area = form.querySelector('.form-error');
  const button = document.createElement('button'); button.type = 'button'; button.textContent = '최신 자료 확인 · 입력 유지';
  button.addEventListener('click', async () => {
    try {
      await refresh();
      const row = payload.candidateId ? state.project?.candidates.find(c => c.id === payload.candidateId) : payload.inquiryId ? state.project?.inquiries.find(q => q.id === payload.inquiryId) : state.project;
      if (!row) throw new Error('현재 자료에 접근할 수 없습니다. 입력 내용은 보존됩니다.');
      const copy = document.createElement('p');
      copy.textContent = '최신 자료: ' + (row.name ? `${row.name} · ${row.address} · ${row.memo || '메모 없음'}` : row.statusLabel || row.title) + ` (버전 ${row.version}). 입력 내용과 비교해 주세요.`;
      const use = document.createElement('button'); use.type = 'button'; use.textContent = '최신 내용을 확인했어요 · 내 입력으로 재시도 준비';
      use.addEventListener('click', () => { payload.version = row.version; form.querySelector('.save-status').textContent = '최신 버전을 확인했습니다. 입력을 검토하고 저장 버튼을 눌러 주세요.'; area.textContent = ''; });
      area.replaceChildren(copy, use);
    } catch (error) { area.textContent = error.message; }
  });
  area.append(button);
}
function bindForm(operation, target, payloadBase, transform, success) {
  const form = body.querySelector('form');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]'); if (button.disabled) return;
    const fields = new FormData(form);
    const payload = { ...payloadBase, ...transform(fields) };
    button.disabled = true; dialog.dataset.saving = 'true'; $('#closeDialog').disabled = true; form.querySelector('[data-close]').disabled = true;
    const area = form.querySelector('.form-error'); area.textContent = '';
    form.querySelector('.save-status').textContent = browserMode ? '이 브라우저에 저장하고 있습니다…' : '서버에 저장하고 있습니다…';
    try {
      const result = await execute(operation, target, payload);
      if (result.project) state.projectId = result.project.id;
      if (result.inquiry) state.inquiryId = result.inquiry.id;
      // A successful write stays successful even if the following read fails.
      form.querySelector('.save-status').textContent = `저장 완료 · ${date(result.inquiry?.updatedAt || result.project?.updatedAt || result.project?.createdAt || new Date().toISOString())}`;
      dialog.close(); announce(success);
      try { await refresh(); restoreDialogFocus(); } catch (readError) { announce(`저장은 완료됐습니다. 목록을 다시 불러오지 못했습니다. ${readError.message}`, true); }
    } catch (error) {
      form.querySelector('.save-status').textContent = error.status && error.status < 500 ? '저장되지 않음 · 입력을 확인해 주세요.' : '저장 결과 미확인 · 같은 내용으로 재시도해 주세요.';
      area.textContent = error.message;
      if (error.code === 'VERSION_CONFLICT') conflictHelp(form, payloadBase);
      area.focus();
    } finally { button.disabled = false; delete dialog.dataset.saving; $('#closeDialog').disabled = false; form.querySelector('[data-close]').disabled = false; }
  });
}
function showProject(trigger) {
  modal('새 창업 사업', formShell(field('title', '사업 이름', '', { required: true, help: '예: 동두천 손세차장 창업' }), '사업 만들기'), trigger);
  bindForm('projects', 'new', {}, f => ({ title: f.get('title') }), '창업 사업을 저장했습니다. 후보지를 등록해 주세요.');
}
function showCandidate(id, trigger) {
  const c = state.project.candidates.find(c => c.id === id);
  modal(c ? '후보지 수정' : '후보지 등록', formShell(`<p class="form-help">면적은 ㎡, 가격은 원 단위입니다. 빈칸과 실제 0원은 다르게 저장합니다.</p><div class="field-grid">${field('name', '후보지 이름', c?.name, { required: true, wide: true })}${field('address', '도로명주소·지번', c?.address, { required: true, max: 300, wide: true })}${field('areaSqm', '면적 (㎡)', c?.areaSqm, { type: 'number' })}${field('priceWon', '알려진 가격 (원)', c?.priceWon, { type: 'number' })}</div>${field('listingUrl', '매물 주소', c?.listingUrl, { type: 'url', max: 1500 })}${field('memo', '장단점·미확인 사항', c?.memo, { type: 'textarea', max: 4000 })}${select('lifecycle', '후보지 상태', lifecycleLabels, c?.lifecycle || 'reviewing')}<p class="form-help">보류·탈락은 삭제가 아닙니다. 기존 제출과 검토 기록은 보존됩니다.</p>`), trigger);
  bindForm(`projects/${state.project.id}/candidates${c ? '/' + c.id : ''}`, c?.id || state.project.id, { ...(c ? { version: c.version, candidateId: c.id } : {}) }, f => Object.fromEntries(['name','address','areaSqm','priceWon','listingUrl','memo','lifecycle'].map(key => [key, f.get(key)])), '후보지를 저장했습니다.');
}
function showSubmit(id, trigger) {
  const c = state.project.candidates.find(c => c.id === id);
  modal('후보지 검토 의뢰', formShell(`<p class="form-help">${browserMode ? '현재 자료를 이 브라우저에 저장하는 체험입니다. 실제 검토 신청은 전송되지 않습니다.' : '아래 후보지의 현재 자료를 확인하고 제출해 주세요. 실제 연락이나 계약은 진행하지 않습니다.'}</p><div class="snapshot">${e(c.name)}\n${e(c.address)}\n면적 ${c.areaSqm == null ? '미입력' : e(c.areaSqm) + '㎡'} · 가격 ${e(money(c.priceWon))}\n${e(c.memo || '메모 없음')}\n후보지 자료 버전 ${c.version}</div>${field('question', '검토를 부탁할 내용', '', { type: 'textarea', max: 4000, required: true })}<label class="check-field"><input name="consent" type="checkbox" required>${browserMode ? '실제 접수가 아닌 체험 자료를 이 브라우저에 저장하는 것을 확인했습니다.' : '이 후보지 자료와 질문을 검토 담당자에게 전달하는 것을 확인했습니다.'}</label>`, '확인하고 검토 의뢰'), trigger);
  bindForm(`projects/${state.project.id}/inquiries`, c.id, { version: c.version, candidateId: c.id }, f => ({ question: f.get('question'), consent: f.get('consent') === 'on' }), browserMode ? '체험 자료를 이 브라우저에 저장했습니다. 실제 검토 신청은 전송되지 않았습니다.' : '검토 의뢰가 접수되었습니다. 접수번호와 처리 상태를 확인해 주세요.');
}
function showAssignment(trigger) {
  modal('담당자 배정·변경', formShell(`${select('assigneeId', '배정 담당자', { '': '미배정으로 전환', ...Object.fromEntries(state.staff.map(p => [p.id, p.label])) }, state.project.assigneeId || '')}${field('reason', '배정·변경 사유 (내부 기록)', '', { type: 'textarea', required: true, max: 1000 })}<p class="form-help">확정 후 이전 담당자의 새 조회·수정·파일 요청은 차단됩니다.</p>`, '배정 확정'), trigger);
  bindForm(`projects/${state.project.id}/assignment`, state.project.id, { version: state.project.version }, f => ({ assigneeId: f.get('assigneeId'), reason: f.get('reason') }), '담당자 배정을 저장했습니다.');
}
function proof(f) { return { source: f.get('source'), checkedBy: f.get('checkedBy'), checkedAt: f.get('checkedAt'), recheck: f.get('recheck') === 'on', recheckReason: f.get('recheckReason'), officialConfirmed: f.get('officialConfirmed') === 'on' }; }
function showAction(action, trigger) {
  const q = state.project.inquiries.find(q => q.id === state.inquiryId);
  let contents = '', title = '', label = '저장하기';
  if (action === 'transition') {
    const allowed = { reviewing: ['received','hold','reopened'], more_info: ['reviewing','reopened'], hold: ['received','reviewing','more_info','reopened'], closed: ['received','reviewing','more_info','answered','hold','reopened'] };
    const labels = { reviewing: '검토 중', more_info: '추가자료 요청', hold: '보류', closed: '종료' };
    title = '처리 상태 변경'; contents = select('status', '다음 상태', Object.fromEntries(Object.entries(labels).filter(([key]) => allowed[key].includes(q.status)))) + field('body', '고객에게 보이는 사유·다음 행동', '', { type: 'textarea', required: true, max: 6000 });
  } else if (action === 'reply' || action === 'correction') {
    title = action === 'correction' ? '공개 답변 정정' : '공개 답변 작성'; label = '공개 답변 저장';
    contents = field('body', '공개 답변', '', { type: 'textarea', required: true, max: 6000 }) + evidenceFields();
    if (action === 'correction') contents += field('reason', '정정 사유 (고객 공개)', '', { required: true, max: 1000 });
  } else if (action === 'review') {
    title = '허가 사전 검토 항목 기록';
    contents = select('item', '검토 항목', reviewLabels) + select('state', '확인 상태', reviewStates, 'recorded') + field('body', '검토 내용·미확인 사항', '', { type: 'textarea', required: true, max: 6000 }) + evidenceFields() + '<p class="form-help">확인 내용이 있어도 허가 확정을 뜻하지 않습니다. 정정 시 이전 기록도 보존됩니다.</p>';
  } else { title = action === 'note' ? '내부 메모 작성' : action === 'followup' ? '같은 접수에 재문의' : '추가자료 내용 제출'; contents = field('body', action === 'note' ? '내부 메모 · 고객에게 공개되지 않음' : '추가로 전달할 내용', '', { type: 'textarea', required: true, max: 6000 }); }
  modal(title, formShell(contents, label), trigger);
  const input = { version: q.version, inquiryId: q.id, ...(action === 'correction' ? { supersedes: trigger.dataset.message } : {}) };
  bindForm(`inquiries/${q.id}/${action === 'correction' ? 'reply' : action}`, q.id, input, f => ({ body: f.get('body'), ...(action === 'transition' ? { status: f.get('status') } : {}), ...(['reply','review','correction'].includes(action) ? proof(f) : {}), ...(action === 'review' ? { item: f.get('item'), state: f.get('state') } : {}), ...(action === 'correction' ? { reason: f.get('reason') } : {}) }), '기록을 저장했습니다.');
  if (action === 'review') {
    const form = body.querySelector('form');
    form.querySelector('[name=state]').addEventListener('change', event => {
      const required = event.target.value === 'recorded';
      ['source','checkedBy','checkedAt'].forEach(name => { const el = form.elements.namedItem(name); el.required = required; if (event.target.value === 'unreviewed') el.value = ''; });
    });
  }
}
function showUpload(trigger) {
  const q = state.project.inquiries.find(q => q.id === state.inquiryId);
  const payloadBase = { version: q.version, inquiryId: q.id };
  modal('현장 사진 첨부', formShell(`<label class="field">사진 선택<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" required><small>시험 사진만 사용하세요. 한 장 2MB, 접수 한 건당 10장까지 저장합니다.</small><span class="field-error"></span></label>${state.actor.role === 'customer' ? '' : select('visibility', '공개 범위', { public: '고객 공개', internal: '내부 전용' })}`), trigger);
  const form = body.querySelector('form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = form.querySelector('[type=submit]'); if (button.disabled) return;
    const area = form.querySelector('.form-error'); area.textContent = ''; button.disabled = true; dialog.dataset.saving = 'true'; $('#closeDialog').disabled = true; form.querySelector('[data-close]').disabled = true;
    try {
      const file = form.elements.photo.files[0];
      if (!file || file.size > 2_000_000 || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('PNG·JPEG·WebP 사진을 2MB 이하로 선택해 주세요.');
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = () => reject(new Error('사진을 읽지 못했습니다.')); reader.readAsDataURL(file); });
      await execute(`inquiries/${q.id}/attachments`, q.id, { ...payloadBase, name: file.name, mime: file.type, data, visibility: form.elements.visibility?.value || 'public' });
      dialog.close(); announce('사진을 저장했습니다.');
      try { await refresh(); restoreDialogFocus(); } catch { announce('사진은 저장됐습니다. 목록 새로고침이 필요합니다.'); }
    } catch (error) { area.textContent = error.message; form.querySelector('.save-status').textContent = '저장 결과를 확인해 주세요. 선택한 사진은 유지됩니다.'; if (error.code === 'VERSION_CONFLICT') conflictHelp(form, payloadBase); area.focus(); }
    finally { button.disabled = false; delete dialog.dataset.saving; $('#closeDialog').disabled = false; form.querySelector('[data-close]').disabled = false; }
  });
}
function entryProof(m) { return `<div class="evidence">근거: ${e(m.source)}<br>확인: ${e(m.checkedBy)} · ${e(m.checkedAt)} · ${m.officialConfirmed ? '담당기관 확인 기록 있음' : '담당기관 확인 여부 미확인'}<br>${m.recheck ? '재확인 필요: ' + e(m.recheckReason) : '재확인 필요 표시 없음'}</div>`; }
function renderInquiry(q) {
  const customer = state.actor.role === 'customer';
  const canReview = ['reviewing','reopened'].includes(q.status);
  const currentReason = q.events.findLast(event => event.status === q.status && event.reason)?.reason;
  return `<section class="inquiry-detail" id="inquiryDetail"><div class="detail-heading"><div><h3>${e(q.snapshot.name)}</h3><p class="receipt">${e(q.receipt)}</p></div><span class="badge ${q.status}">${e(q.statusLabel)}</span></div><p class="detail-question">${e(q.question)}</p>${currentReason ? `<p class="snapshot"><strong>안내·다음 행동</strong><br>${e(currentReason)}</p>` : ''}<p class="small-copy">마지막 저장 ${date(q.updatedAt)} · 후보지 제출 버전 ${q.candidateVersion}</p><details><summary>제출 당시 후보지 자료</summary><div class="snapshot">${e(q.snapshot.name)}\n${e(q.snapshot.address)}\n${e(q.snapshot.memo || '메모 없음')}\n면적 ${q.snapshot.area_sqm == null ? '미입력' : e(q.snapshot.area_sqm) + '㎡'} · 가격 ${e(money(q.snapshot.price_won))}</div></details><div class="inquiry-actions">${customer ? `${['answered','hold','closed'].includes(q.status) ? '<button data-action="followup">같은 접수에 재문의</button>' : ''}${q.status === 'more_info' ? '<button data-action="additional">추가자료 제출</button>' : ''}` : `${q.status !== 'closed' ? '<button data-action="transition">처리 상태 변경</button>' : ''}${canReview ? '<button data-action="review">허가 검토 항목 기록</button>' : ''}${q.status === 'reviewing' ? '<button class="primary" data-action="reply">공개 답변 작성</button>' : ''}<button data-action="note">내부 메모</button>`}<button data-action="upload">현장 사진 첨부</button></div>${q.attachments.length ? `<div class="attachment-list">${q.attachments.map(a => `<a href="${browserMode ? '#' : '/api/workspace/attachments/' + e(a.id)}" data-browser-attachment="${e(a.id)}" download>${e(a.name)}${a.visibility === 'internal' ? ' · 내부 전용' : ''} ↓</a>`).join('')}</div>` : ''}${q.reviews.length ? `<h3 class="section-top">허가 검토 기록</h3>${q.reviews.map(r => `<article class="review-record"><strong>${e(reviewLabels[r.item])} · ${e(reviewStates[r.state])}</strong><p>${e(r.body)}</p>${r.state !== 'unreviewed' ? entryProof(r) : '<p class="small-copy">확인 주체·확인일 미확인</p>'}<span class="small-copy">기록 ${date(r.createdAt)}</span></article>`).join('')}` : ''}<h3 class="section-top">답변·대화 이력</h3>${q.messages.length ? q.messages.map(m => `<article class="thread-entry ${m.kind === 'note' ? 'note' : ''}"><div class="entry-meta"><strong>${e(messageLabels[m.kind])}${m.supersedes ? ' · 정정본' : ''}</strong><span>${e(m.author)} · ${date(m.createdAt)}</span></div><p>${e(m.body)}</p>${m.kind === 'reply' ? entryProof(m) : ''}${!customer && m.kind === 'reply' && q.status === 'answered' ? `<button class="text-button" data-action="correction" data-message="${e(m.id)}">이 답변 정정 기록 추가</button>` : ''}</article>`).join('') : '<p class="small-copy">아직 등록된 답변이 없습니다. 검토 상태는 이 화면에서 확인할 수 있습니다.</p>'}<details><summary>처리 이력 ${q.events.length}건</summary><ol class="event-list">${q.events.map(ev => `<li>${date(ev.createdAt)} · ${e(ev.status ? ({ received:'접수',reviewing:'검토 중',more_info:'추가자료 요청',answered:'답변 완료',hold:'보류',closed:'종료',reopened:'재문의' })[ev.status] : ev.kind === 'attachment' ? '사진 첨부' : ev.kind === 'note' ? '내부 메모' : '검토 기록')}${ev.reason ? ' · ' + e(ev.reason) : ''}${ev.correctionReason ? ' · 정정 사유: ' + e(ev.correctionReason) : ''}</li>`).join('')}</ol></details></section>`;
}
function render() {
  const customer = state.actor.role === 'customer';
  $('#newProjectButton').hidden = !customer;
  if (!state.projects.length) {
    app.innerHTML = `<div class="empty-state"><p class="eyebrow">ONE STEP AT A TIME</p><h2>${customer ? '첫 후보지부터 차근차근 준비해요' : '현재 확인할 사업이 없습니다'}</h2><p>${customer ? '사업을 만들고 후보지 주소와 궁금한 점을 정리하세요. 검토 결과와 이전 기록을 한곳에서 이어 볼 수 있습니다.' : state.actor.role === 'staff' ? '관리 책임자가 사업을 배정하면 이곳에 표시됩니다. 미배정 사업이나 다른 담당자의 자료는 표시되지 않습니다.' : '고객이 사업과 검토 의뢰를 등록하면 목록에서 확인하고 담당자를 배정할 수 있습니다.'}</p>${customer ? '<button class="primary" data-action="new-project">+ 첫 창업 사업 만들기</button>' : '<button data-action="refresh">새로고침</button>'}</div>`;
    return;
  }
  const p = state.project;
  const q = p?.inquiries.find(q => q.id === state.inquiryId);
  const phase = !p?.candidates.length ? 0 : !p.inquiries.length ? 1 : !p.inquiries.some(q => q.status === 'answered') ? 2 : 3;
  app.innerHTML = `<div class="workspace-layout"><aside class="project-sidebar" aria-label="내 사업 목록"><p class="sidebar-heading">${customer ? '내 창업 사업' : '확인 가능한 사업'} <span>${state.projects.length}</span></p>${state.projects.map(item => `<button class="project-link ${item.id === p?.id ? 'active' : ''}" data-action="project" data-id="${e(item.id)}" ${item.id === p?.id ? 'aria-current="true"' : ''}>${e(item.title)}<span>후보지 ${item.candidateCount} · 의뢰 ${item.inquiryCount}${!item.assigned ? ' · 미배정' : ''}</span></button>`).join('')}</aside><div class="project-content">${p ? `<div class="project-heading"><div><p class="eyebrow">MY BUSINESS</p><h2>${e(p.title)}</h2><p class="small-copy">마지막 변경 ${date(p.updatedAt)}</p></div><button data-action="refresh">새로고침</button></div><ol class="journey" aria-label="검토 진행 단계">${['후보지 정리','검토 의뢰','담당자 확인','결과 확인'].map((label,i) => `<li class="${i < phase ? 'done' : i === phase ? 'current' : ''}" ${i === phase ? 'aria-current="step"' : ''}><b>${i < phase ? '✓' : i + 1}</b>${label}</li>`).join('')}</ol>${state.actor.role === 'manager' ? `<section class="assignment-box"><h3>담당자 배정</h3><p class="small-copy">현재 ${e(state.staff.find(s => s.id === p.assigneeId)?.label || '미배정')}</p><button class="secondary" data-action="assign">담당자 배정·변경</button>${p.assignmentHistory.length ? `<details><summary>내부 배정 이력</summary><ul class="event-list">${p.assignmentHistory.map(h => `<li>${date(h.createdAt)} · ${e(h.actor)} · ${e(h.reason)}</li>`).join('')}</ul></details>` : ''}</section>` : ''}<div class="section-top"><h3>후보지 <span>${p.candidates.length}</span></h3>${customer ? '<button data-action="candidate">+ 후보지 등록</button>' : ''}</div>${p.candidates.length ? `<div class="candidate-grid">${p.candidates.map(c => `<article class="candidate-card"><span class="badge ${c.lifecycle}">${e(lifecycleLabels[c.lifecycle])}</span><h3>${e(c.name)}</h3><p class="candidate-address">${e(c.address)}</p><dl class="candidate-facts"><div><dt>면적</dt><dd>${c.areaSqm == null ? '미입력' : e(c.areaSqm) + '㎡'}</dd></div><div><dt>알려진 가격</dt><dd>${e(money(c.priceWon))}</dd></div></dl><div class="card-actions">${customer ? `<button class="secondary" data-action="submit" data-id="${e(c.id)}">후보지 검토 맡기기</button><button data-action="candidate" data-id="${e(c.id)}">후보지 수정</button>` : '<span class="small-copy">고객이 제출한 후보지 자료입니다.</span>'}</div><p class="small-copy">저장 ${date(c.updatedAt)} · 버전 ${c.version}</p></article>`).join('')}</div>` : '<div class="empty-state"><h3>아직 등록한 후보지가 없습니다</h3><p>후보지 이름과 주소를 정리해 검토를 준비하세요.</p></div>'}<div class="section-top"><h3>검토 의뢰 <span>${p.inquiries.length}</span></h3><span class="small-copy">구매 의무 없이 검토할 수 있어요</span></div>${p.inquiries.length ? `<div class="inquiry-list">${p.inquiries.map(item => `<button data-action="inquiry" data-id="${e(item.id)}" class="${item.id === q?.id ? 'active' : ''}" ${item.id === q?.id ? 'aria-current="true"' : ''}><span>${e(item.snapshot.name)}<small>${e(item.receipt)}</small></span><span class="badge ${item.status}">${e(item.statusLabel)}</span></button>`).join('')}</div>${q ? renderInquiry(q) : ''}` : '<p class="small-copy">후보지의 ‘검토 맡기기’를 눌러 내용을 확인한 뒤 제출하세요.</p>'}` : ''}</div></div>`;
}
app.addEventListener('click', async event => {
  const attachment = event.target.closest('[data-browser-attachment]');
  if (attachment && browserWorkspace) {
    event.preventDefault();
    try {
      const file = await browserWorkspace.download(attachment.dataset.browserAttachment);
      const url = URL.createObjectURL(file.blob), link = document.createElement('a');
      link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { announce(error.message, true); }
    return;
  }
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  try {
    if (action === 'new-project') showProject(button);
    else if (action === 'candidate') showCandidate(button.dataset.id, button);
    else if (action === 'submit') showSubmit(button.dataset.id, button);
    else if (action === 'assign') showAssignment(button);
    else if (action === 'project') { state.projectId = button.dataset.id; state.inquiryId = null; await refresh(); }
    else if (action === 'inquiry') { state.inquiryId = button.dataset.id; render(); $('#inquiryDetail').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (action === 'refresh') { await refresh(); announce('최신 자료를 불러왔습니다.'); }
    else if (action === 'upload') showUpload(button);
    else showAction(action, button);
  } catch (error) { announce(error.message, true); }
});
$('#newProjectButton').addEventListener('click', event => showProject(event.currentTarget));
async function chooseActor(id) {
  ++refreshSequence;
  state.actor = (await api('demo/actor', { actorId: id })).actor;
  state.projectId = null; state.inquiryId = null; state.project = null;
  state.staff = state.actor.role === 'manager' ? (await api('staff')).staff : [];
  await refresh(); announce(browserMode ? `${state.actor.label} 화면입니다. 현재 브라우저의 체험 자료만 표시됩니다.` : `${state.actor.label}의 시험 자료입니다.`);
}
$('#actorSelect').addEventListener('change', async event => {
  event.target.disabled = true;
  try { await chooseActor(event.target.value); } catch (error) { announce(error.message, true); app.textContent = '자료를 불러오지 못했습니다. 새로고침해서 시험 역할을 다시 선택해 주세요.'; }
  finally { event.target.disabled = false; }
});
try {
  if (browserMode) {
    document.querySelector('.demo-banner strong').textContent = '창업 진행판 체험';
    document.querySelector('.demo-banner span').textContent = '이 브라우저에만 저장되며 실제 검토 접수는 전송되지 않습니다. 개인정보 대신 예시 자료를 입력하세요.';
    document.querySelector('.actor-control').firstChild.textContent = '화면 살펴보기';
    $('#actorSelect').setAttribute('aria-label', '체험 화면 선택');
  }
  const meta = await api('demo');
  if (!meta.demo) throw new Error('이 진행판은 로그인 준비 전 로컬 시험 환경에서만 실행됩니다.');
  $('#actorSelect').innerHTML = meta.principals.map(p => `<option value="${e(p.id)}">${e(p.label)}</option>`).join('');
  if (meta.actor) {
    state.actor = meta.actor; $('#actorSelect').value = meta.actor.id;
    state.staff = meta.actor.role === 'manager' ? (await api('staff')).staff : [];
    await refresh();
  } else await chooseActor('customer-a');
  $('#actorSelect').disabled = false;
} catch (error) {
  app.innerHTML = `<div class="empty-state"><h2>개발 미리보기 연결이 필요합니다</h2><p>${e(error.message)}</p></div>`;
  announce('운영 로그인과 고객 접수는 이번 구현 범위에 포함하지 않았습니다.', true);
}
