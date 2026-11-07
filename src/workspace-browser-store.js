// Public experience mode: all records stay in this browser's IndexedDB.
// Role switching is an illustration over local records, never a server identity.
const principals = [
  { id: 'customer-a', label: '고객 가', role: 'customer' },
  { id: 'customer-b', label: '고객 나', role: 'customer' },
  { id: 'manager', label: '관리 책임자', role: 'manager' },
  { id: 'staff-a', label: '담당자 가', role: 'staff' },
  { id: 'staff-b', label: '담당자 나', role: 'staff' },
];
const labels = { received: '체험 접수', reviewing: '검토 중', more_info: '추가자료 요청', answered: '답변 완료', hold: '보류', reopened: '재문의', closed: '종료' };
const iso = () => new Date().toISOString();
function error(status, code, message) { const e = new Error(message); e.status = status; e.code = code; throw e; }
function required(value, max = 6000) { if (typeof value !== 'string' || !value.trim() || value.length > max) error(400, 'INVALID_INPUT', '필수 항목과 입력 길이를 확인해 주세요.'); return value.trim(); }
function checkVersion(row, payload) { if (row.version !== payload.version) error(409, 'VERSION_CONFLICT', '다른 화면에서 자료가 바뀌었습니다. 입력을 유지한 채 최신 자료를 확인해 주세요.'); }
function numeric(value, integer = false) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > Number.MAX_SAFE_INTEGER || (integer && !Number.isSafeInteger(n))) error(400, 'INVALID_INPUT', '면적·금액의 단위와 숫자를 확인해 주세요.');
  return n;
}
export function createBrowserWorkspace() {
  let selected = null;
  try { selected = principals.find(p => p.id === sessionStorage.getItem('sonsecha-workspace-browser-actor')); } catch { /* role can still be selected for this tab */ }
  let database;
  const open = () => database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('sonsecha-workspace-experience-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
    request.onerror = () => { database = null; reject(new Error('이 브라우저에서 체험 자료 저장소를 열지 못했습니다.')); };
    request.onblocked = () => { database = null; reject(new Error('다른 체험 화면을 닫은 뒤 다시 시도해 주세요.')); };
  });
  async function transaction(write, work) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', write ? 'readwrite' : 'readonly');
      const storage = tx.objectStore('workspace'); const read = storage.get('state');
      let result, failure;
      read.onsuccess = () => {
        try {
          const data = read.result || { projects: {}, submissions: {} };
          result = work(data);
          if (write) storage.put(data, 'state');
        } catch (e) { failure = e; tx.abort(); }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || new Error('브라우저에 저장하지 못했습니다. 입력은 유지되니 저장 공간과 설정을 확인해 주세요.'));
      tx.onerror = () => { /* onabort reports the final write result */ };
    });
  }
  function access(data, id) {
    const p = data.projects[id];
    if (!p || (selected.role === 'customer' ? p.ownerId !== selected.id : selected.role === 'staff' ? p.assigneeId !== selected.id : false)) error(404, 'NOT_FOUND', '체험 자료를 찾을 수 없습니다.');
    return p;
  }
  function customer(p) { if (selected.role !== 'customer' || p.ownerId !== selected.id) error(403, 'FORBIDDEN', '고객 화면에서 사용할 수 있습니다.'); }
  function staff() { if (!['manager', 'staff'].includes(selected.role)) error(403, 'FORBIDDEN', '검토 담당 화면에서 사용할 수 있습니다.'); }
  function viewInquiry(q) {
    const r = structuredClone(q);
    r.statusLabel = labels[r.status];
    if (selected.role === 'customer') {
      r.messages = r.messages.filter(m => m.kind !== 'note');
      r.attachments = r.attachments.filter(a => a.visibility === 'public');
      r.events = r.events.filter(ev => ev.visibility !== 'internal');
    }
    r.attachments = r.attachments.map(({ data, ...a }) => a);
    return r;
  }
  function viewProject(p) {
    const copy = structuredClone(p);
    delete copy.ownerId;
    copy.assigned = !!p.assigneeId;
    copy.inquiries = p.inquiries.map(viewInquiry).reverse();
    if (selected.role === 'customer') { delete copy.assigneeId; delete copy.assignmentHistory; }
    return copy;
  }
  function findInquiry(data, id) {
    for (const p of Object.values(data.projects)) {
      const q = p.inquiries.find(q => q.id === id);
      if (q) { access(data, p.id); return { p, q }; }
    }
    error(404, 'NOT_FOUND', '체험 의뢰를 찾을 수 없습니다.');
  }
  function event(q, kind, fields = {}, visibility = 'public') { q.events.push({ kind, ...fields, visibility, createdAt: iso() }); }
  function proof(input, must = true) {
    const p = { source: input.source || '', checkedBy: input.checkedBy || '', checkedAt: input.checkedAt || '', recheck: input.recheck === true, recheckReason: input.recheckReason || '', officialConfirmed: input.officialConfirmed === true };
    if (must) { required(p.source, 2000); required(p.checkedBy, 160); required(p.checkedAt, 10); }
    if (p.checkedAt && (!/^\d{4}-\d{2}-\d{2}$/.test(p.checkedAt) || !Number.isFinite(Date.parse(p.checkedAt)) || new Date(p.checkedAt).toISOString().slice(0, 10) !== p.checkedAt)) error(400, 'INVALID_INPUT', '확인일을 확인해 주세요.');
    if (p.recheck) required(p.recheckReason, 2000);
    return p;
  }
  function result(data, descriptor) { return descriptor.projectId ? { project: viewProject(access(data, descriptor.projectId)) } : { inquiry: viewInquiry(findInquiry(data, descriptor.inquiryId).q) }; }
  async function request(path, payload) {
    if (path === 'demo') return { demo: true, storage: 'browser', principals, actor: selected, statusLabels: labels };
    if (path === 'demo/actor') {
      selected = principals.find(p => p.id === payload?.actorId);
      if (!selected) error(400, 'UNKNOWN_ACTOR', '체험 화면을 선택해 주세요.');
      try { sessionStorage.setItem('sonsecha-workspace-browser-actor', selected.id); } catch { /* tab-only choice */ }
      return { actor: selected };
    }
    if (!selected) error(401, 'IDENTITY_REQUIRED', '체험 화면을 선택해 주세요.');
    if (path === 'staff') { if (selected.role !== 'manager') error(403, 'FORBIDDEN', '관리 책임자 화면에서 확인해 주세요.'); return { staff: principals.filter(p => p.role === 'staff') }; }
    return transaction(!!payload, data => {
      let match;
      if (!payload) {
        if (path === 'projects') return { projects: Object.values(data.projects).filter(p => selected.role === 'customer' ? p.ownerId === selected.id : selected.role === 'staff' ? p.assigneeId === selected.id : true).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(p => ({ id: p.id, title: p.title, version: p.version, assigned: !!p.assigneeId, updatedAt: p.updatedAt, candidateCount: p.candidates.length, inquiryCount: p.inquiries.length })) };
        if ((match = path.match(/^projects\/([\w-]+)$/))) return { project: viewProject(access(data, match[1])) };
        if ((match = path.match(/^inquiries\/([\w-]+)$/))) return { inquiry: viewInquiry(findInquiry(data, match[1]).q) };
        error(404, 'NOT_FOUND', '지원하지 않는 체험 화면입니다.');
      }
      required(payload.requestId, 100);
      const key = `${selected.id}:${path}:${payload.requestId}`, fingerprint = JSON.stringify(payload);
      if (data.submissions[key]) {
        if (data.submissions[key].fingerprint !== fingerprint) error(409, 'IDEMPOTENCY_CONFLICT', '같은 제출 식별값의 내용이 달라졌습니다.');
        return result(data, data.submissions[key].descriptor);
      }
      let descriptor;
      if (path === 'projects') {
        if (selected.role !== 'customer') error(403, 'FORBIDDEN', '고객 화면에서 사업을 등록해 주세요.');
        const id = crypto.randomUUID();
        data.projects[id] = { id, title: required(payload.title, 160), ownerId: selected.id, assigneeId: null, version: 1, candidates: [], inquiries: [], assignmentHistory: [], createdAt: iso(), updatedAt: iso() };
        descriptor = { projectId: id };
      } else if ((match = path.match(/^projects\/([\w-]+)\/candidates(?:\/([\w-]+))?$/))) {
        const p = access(data, match[1]); customer(p);
        const previous = match[2] ? p.candidates.find(c => c.id === match[2]) : null;
        if (match[2] && !previous) error(404, 'NOT_FOUND', '후보지를 찾을 수 없습니다.');
        if (previous) checkVersion(previous, payload);
        const listingUrl = payload.listingUrl || '';
        if (listingUrl) { let url; try { url = new URL(listingUrl); } catch { error(400, 'INVALID_INPUT', '매물 주소를 확인해 주세요.'); } if (!['http:', 'https:'].includes(url.protocol)) error(400, 'INVALID_INPUT', 'http 또는 https 주소를 입력해 주세요.'); }
        const c = { id: previous?.id || crypto.randomUUID(), version: (previous?.version || 0) + 1, name: required(payload.name, 160), address: required(payload.address, 300), areaSqm: numeric(payload.areaSqm), priceWon: numeric(payload.priceWon, true), listingUrl, memo: payload.memo || '', lifecycle: payload.lifecycle || 'reviewing', updatedAt: iso() };
        if (!['reviewing', 'selected', 'hold', 'rejected'].includes(c.lifecycle)) error(400, 'INVALID_INPUT', '후보지 상태를 확인해 주세요.');
        if (previous) p.candidates[p.candidates.indexOf(previous)] = c; else p.candidates.push(c);
        p.updatedAt = iso(); descriptor = { projectId: p.id };
      } else if ((match = path.match(/^projects\/([\w-]+)\/assignment$/))) {
        const p = access(data, match[1]); if (selected.role !== 'manager') error(403, 'FORBIDDEN', '관리 책임자 화면에서 배정해 주세요.');
        checkVersion(p, payload); required(payload.reason, 1000);
        if (payload.assigneeId && !principals.some(a => a.id === payload.assigneeId && a.role === 'staff')) error(400, 'INVALID_INPUT', '담당자를 확인해 주세요.');
        p.assignmentHistory.push({ from: p.assigneeId, to: payload.assigneeId || null, actor: selected.label, reason: payload.reason, createdAt: iso() });
        p.assigneeId = payload.assigneeId || null; p.version++; p.updatedAt = iso(); descriptor = { projectId: p.id };
      } else if ((match = path.match(/^projects\/([\w-]+)\/inquiries$/))) {
        const p = access(data, match[1]); customer(p);
        if (!payload.consent) error(400, 'CONSENT_REQUIRED', '체험 의뢰 내용을 확인해 주세요.');
        const c = p.candidates.find(c => c.id === payload.candidateId); if (!c) error(404, 'NOT_FOUND', '후보지를 찾을 수 없습니다.'); checkVersion(c, payload);
        const snapshot = { ...structuredClone(c), area_sqm: c.areaSqm, price_won: c.priceWon };
        const q = { id: crypto.randomUUID(), projectId: p.id, candidateId: c.id, candidateVersion: c.version, receipt: 'DEMO-' + crypto.randomUUID().slice(0, 8).toUpperCase(), snapshot, question: required(payload.question, 4000), status: 'received', version: 1, messages: [], reviews: [], attachments: [], events: [], createdAt: iso(), updatedAt: iso() };
        event(q, 'submitted', { status: 'received' }); p.inquiries.push(q); p.updatedAt = iso(); descriptor = { inquiryId: q.id };
      } else if ((match = path.match(/^inquiries\/([\w-]+)\/(transition|reply|followup|additional|note|review|attachments)$/))) {
        const { p, q } = findInquiry(data, match[1]); const action = match[2];
        checkVersion(q, payload); const before = q.status;
        if (['followup', 'additional'].includes(action)) customer(p); else if (action !== 'attachments') staff();
        const message = kind => q.messages.push({ id: crypto.randomUUID(), kind, author: selected.label, body: required(payload.body), createdAt: iso(), ...(['reply'].includes(kind) ? proof(payload) : {}), supersedes: payload.supersedes || null });
        if (action === 'transition') {
          const allowed = { reviewing: ['received', 'hold', 'reopened'], more_info: ['reviewing', 'reopened'], hold: ['received', 'reviewing', 'more_info', 'reopened'], closed: ['received', 'reviewing', 'more_info', 'answered', 'hold', 'reopened'] };
          required(payload.body); if (!allowed[payload.status]?.includes(q.status)) error(409, 'INVALID_TRANSITION', '현재 상태에서 허용되지 않는 변경입니다.'); q.status = payload.status;
        } else if (action === 'followup') { if (!['answered', 'hold', 'closed'].includes(q.status)) error(409, 'INVALID_TRANSITION', '답변 완료·보류·종료 뒤 재문의할 수 있습니다.'); message('followup'); q.status = 'reopened'; }
        else if (action === 'additional') { if (q.status !== 'more_info') error(409, 'INVALID_TRANSITION', '추가자료 요청 상태가 아닙니다.'); message('additional'); q.status = 'reviewing'; }
        else if (action === 'note') message('note');
        else if (action === 'reply') {
          if (payload.supersedes) { if (q.status !== 'answered' || !q.messages.some(m => m.id === payload.supersedes && m.kind === 'reply')) error(409, 'INVALID_TRANSITION', '정정할 답변을 확인해 주세요.'); required(payload.reason, 1000); }
          else if (q.status !== 'reviewing') error(409, 'INVALID_TRANSITION', '검토 중에 답변을 작성해 주세요.');
          message('reply'); q.status = 'answered';
        } else if (action === 'review') {
          if (!['reviewing', 'reopened'].includes(q.status) || !['land', 'building', 'water', 'access'].includes(payload.item) || !['unreviewed', 'checking', 'recorded', 'needs_review'].includes(payload.state)) error(400, 'INVALID_INPUT', '검토 상태와 항목을 확인해 주세요.');
          q.reviews.push({ id: crypto.randomUUID(), item: payload.item, state: payload.state, body: required(payload.body), ...(payload.state === 'unreviewed' ? { source: '', checkedBy: '', checkedAt: '', recheck: false } : proof(payload, payload.state === 'recorded')), createdAt: iso() });
        } else {
          const visibility = payload.visibility || 'public';
          if (!['public', 'internal'].includes(visibility) || (selected.role === 'customer' && visibility === 'internal')) error(403, 'FORBIDDEN', '사진 공개 범위를 확인해 주세요.');
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(payload.mime) || typeof payload.data !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.data)) error(400, 'INVALID_FILE', '사진 파일을 확인해 주세요.');
          const size = atob(payload.data).length;
          if (size > 2_000_000 || q.attachments.length >= 10) error(400, 'FILE_LIMIT', '한 장 2MB·의뢰당 10장까지 체험할 수 있습니다.');
          q.attachments.push({ id: crypto.randomUUID(), name: required(payload.name, 160), mime: payload.mime, data: payload.data, size, visibility, createdAt: iso() });
        }
        q.version++; q.updatedAt = iso(); p.updatedAt = iso();
        event(q, action, { from: before, status: q.status, ...(action === 'transition' ? { reason: payload.body } : {}), ...(payload.supersedes ? { correctionReason: payload.reason } : {}) }, action === 'note' || payload.visibility === 'internal' ? 'internal' : 'public');
        descriptor = { inquiryId: q.id };
      } else error(404, 'NOT_FOUND', '지원하지 않는 체험 기능입니다.');
      data.submissions[key] = { fingerprint, descriptor };
      return result(data, descriptor);
    });
  }
  async function download(id) {
    return transaction(false, data => {
      for (const p of Object.values(data.projects)) for (const q of p.inquiries) {
        const a = q.attachments.find(a => a.id === id);
        if (a) { access(data, p.id); if (selected.role === 'customer' && a.visibility !== 'public') error(404, 'NOT_FOUND', '사진을 찾을 수 없습니다.'); return { name: a.name, blob: new Blob([Uint8Array.from(atob(a.data), c => c.charCodeAt(0))], { type: a.mime }) }; }
      }
      error(404, 'NOT_FOUND', '사진을 찾을 수 없습니다.');
    });
  }
  return { request, download };
}
