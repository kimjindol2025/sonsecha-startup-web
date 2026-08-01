import assert from 'node:assert/strict';

const debuggerPort = process.env.CHROME_DEBUG_PORT || '9229';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:40431';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || '';
const photoPath = process.env.TEST_PHOTO_PATH || '';

const targets = await fetch(`http://127.0.0.1:${debuggerPort}/json`).then((response) => response.json());
const target = targets.find((item) => item.type === 'page');
if (!target) throw new Error('Chrome page target not found');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
};

function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function waitFor(expression, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await evaluate(`Boolean(${expression})`)) return;
    } catch { /* DOM may be between renders */ }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out: ${expression}`);
}

async function navigate(url) {
  await command('Page.navigate', { url });
  await waitFor('document.readyState === "complete"');
}

const setValue = (selector, value) => evaluate(`(() => { const element = document.querySelector(${JSON.stringify(selector)}); element.value = ${JSON.stringify(value)}; element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return element.value; })()`);
const click = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);

await command('Page.enable');
await command('Runtime.enable');
await navigate(base);
await evaluate(`localStorage.clear(); indexedDB.deleteDatabase('sonsecha-consultation-photos'); location.reload()`);
await waitFor('document.querySelector("[data-consultation-create]")');

await setValue('[data-candidate-field="name"]', '브라우저 후보지 A');
await setValue('[data-candidate-field="address"]', '비공유 주소 A');
await setValue('[data-candidate-field="washType"]', '디테일링 복합형');
await setValue('[data-candidate-field="bayCount"]', '2베이');
await click('[data-detail-check="1-0"]');
await setValue('[data-detail-note="1-0"]', 'A 기존 메모 보존 확인');
const candidateA = await evaluate(`JSON.parse(localStorage.getItem('sonsecha-candidates-v2')).activeId`);

await click('[data-consultation-create]');
await waitFor('document.querySelector("[data-consultation-form]")');
assert.equal(await evaluate(`[...document.querySelectorAll('.consultation-options input')].every((item) => !item.checked)`), true);
await click('[name="shareNotes"]');
await setValue('[name="question"]', 'A 후보지 검토 질문입니다.');
await evaluate(`document.querySelector('[data-consultation-form]').requestSubmit()`);
await waitFor('document.querySelector("[data-consent]")');
await click('[data-send]');
assert.match(await evaluate(`document.querySelector('[data-send-status]').textContent`), /동의/);
await click('[data-consent]');
await click('[data-send]');
await waitFor('document.querySelector(".consultation-room")', 15000);
const firstRecord = await evaluate(`JSON.parse(localStorage.getItem('sonsecha-consultations-v1'))[${JSON.stringify(candidateA)}][0]`);

await click('[data-consultation-close]');
await click('[data-candidate-add]');
await setValue('[data-candidate-field="name"]', '브라우저 후보지 B');
await setValue('[data-candidate-field="address"]', '공유 승인 주소 B');
const candidateB = await evaluate(`JSON.parse(localStorage.getItem('sonsecha-candidates-v2')).activeId`);
assert.notEqual(candidateA, candidateB);

await click('[data-consultation-create]');
await waitFor('document.querySelector("[data-consultation-form]")');
await click('[name="shareAddress"]');
if (photoPath) {
  const documentNode = await command('DOM.getDocument');
  const inputNode = await command('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '[data-photo-input]' });
  await command('DOM.setFileInputFiles', { nodeId: inputNode.nodeId, files: [photoPath] });
  await waitFor('document.querySelectorAll("[data-photo-id]").length === 1', 15000);
  await click('[name="sharePhotos"]');
}
await setValue('[name="question"]', 'B 후보지 사진 포함 질문입니다.');
await evaluate(`document.querySelector('[data-consultation-form]').requestSubmit()`);
await waitFor('document.querySelector("[data-consent]")');
await click('[data-consent]');
await click('[data-send]');
await waitFor('document.querySelector(".consultation-room")', 20000);
const browserRecords = await evaluate(`JSON.parse(localStorage.getItem('sonsecha-consultations-v1'))`);
assert.equal(browserRecords[candidateA].length, 1);
assert.equal(browserRecords[candidateB].length, 1);
assert.notEqual(browserRecords[candidateA][0].receipt, browserRecords[candidateB][0].receipt);

if (adminPassword) {
  await navigate(`${base}/admin.html`);
  await waitFor('document.querySelector("#adminPassword")');
  await setValue('#adminPassword', adminPassword);
  await evaluate(`document.querySelector('#loginForm').requestSubmit()`);
  await waitFor('!document.querySelector("#dashboard").hidden', 10000);
  await click('[data-admin-section="consultations"]');
  await waitFor(`document.querySelector('[data-consultation-receipt=${JSON.stringify(firstRecord.receipt)}]')`, 10000);
  await click(`[data-consultation-receipt="${firstRecord.receipt}"]`);
  await waitFor('document.querySelector("[data-admin-reply-form]")');
  await setValue('[data-admin-reply-form] select[name="context"]', '1-0');
  await setValue('[data-admin-reply-form] textarea[name="body"]', '브라우저 관리자 답변 A');
  await evaluate(`document.querySelector('[data-admin-reply-form]').requestSubmit()`);
  await waitFor(`document.querySelector('.consultation-admin-messages').textContent.includes('브라우저 관리자 답변 A')`, 10000);
  await setValue('[data-consultation-status]', 'answered');
  await waitFor(`document.querySelector('[data-consultation-status]').value === 'answered'`, 10000);

  await navigate(base);
  await waitFor('document.querySelector("[data-consultation-history]")');
  await click(`[data-candidate-id="${candidateA}"]`);
  await click('[data-consultation-history]');
  await waitFor(`document.querySelector('.conversation-list').textContent.includes('브라우저 관리자 답변 A')`, 10000);
  await click('[data-apply-reply]');
  const preserved = await evaluate(`(() => { const state = JSON.parse(localStorage.getItem('sonsecha-candidates-v2')); const candidate = state.candidates.find((item) => item.id === ${JSON.stringify(candidateA)}); return { detail: candidate.detailNotes['1-0'], replies: candidate.consultationNotes.length }; })()`);
  assert.equal(preserved.detail, 'A 기존 메모 보존 확인');
  assert.equal(preserved.replies, 1);
  await evaluate('location.reload()');
  await waitFor('document.querySelector("[data-consultation-history]")');
  const refreshed = await evaluate(`(() => { const state = JSON.parse(localStorage.getItem('sonsecha-candidates-v2')); const candidate = state.candidates.find((item) => item.id === ${JSON.stringify(candidateA)}); return { activeId: state.activeId, detail: candidate.detailNotes['1-0'], replies: candidate.consultationNotes.length }; })()`);
  assert.equal(refreshed.activeId, candidateA);
  assert.equal(refreshed.detail, 'A 기존 메모 보존 확인');
  assert.equal(refreshed.replies, 1);
}

await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await navigate(base);
await waitFor('document.querySelector("[data-consultation-create]")');
const mobile = await evaluate(`({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })`);
assert.equal(mobile.scroll, mobile.client);
await click('[data-consultation-create]');
await waitFor('document.querySelector(".consultation-modal.open")');
const modalRect = await evaluate(`(() => { const rect = document.querySelector('.consultation-modal').getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width, viewport: innerWidth, scroll: document.documentElement.scrollWidth }; })()`);
assert.ok(modalRect.left >= 0 && modalRect.right <= modalRect.viewport);
assert.equal(modalRect.scroll, modalRect.viewport);

console.log('browser consultation smoke: PASS');
socket.close();
