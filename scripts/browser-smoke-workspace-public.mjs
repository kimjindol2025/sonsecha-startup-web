import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = process.env.TEST_BASE_URL;
assert(base && ['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Run this write test only on an explicit local static preview');
const targets = await (await fetch(`http://127.0.0.1:${process.env.CHROME_DEBUG_PORT || 9229}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && t.url.startsWith(base)); assert(target);
const socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { socket.onopen = r; socket.onerror = j; });
let next = 0; const pending = new Map(), apiRequests = [], exceptions = [];
socket.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('/api/workspace')) apiRequests.push(m.params.request.url);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  const item = pending.get(m.id); if (!item) return; pending.delete(m.id); clearTimeout(item.timer);
  m.error ? item.reject(Error(m.error.message)) : item.resolve(m.result);
};
const command = (method, params = {}) => new Promise((resolveCommand, reject) => { const id = ++next, timer = setTimeout(() => { pending.delete(id); reject(Error('Timeout: ' + method)); }, 10000); pending.set(id, { resolve: resolveCommand, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
async function evaluate(expression) { const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value; }
async function wait(expression) { for (let n = 0; n < 120; n++) { try { if (await evaluate(`Boolean(${expression})`)) return; } catch (e) { if (!/context|document|Cannot read/.test(e.message)) throw e; } await new Promise(r => setTimeout(r, 50)); } assert.fail('Timed out: ' + expression); }
async function click(selector) { const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`); await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point }); await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point }); }
async function fill(name, value) { await evaluate(`{const e=document.querySelector('#workspaceDialog [name="${name}"]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}`); }
async function submit() { await click('#workspaceDialog [type=submit]'); }
async function saved() { await wait("!document.querySelector('#workspaceDialog').open"); }
async function role(id) { await evaluate(`{const e=document.querySelector('#actorSelect');e.value=${JSON.stringify(id)};e.dispatchEvent(new Event('change',{bubbles:true}));}`); await wait("!document.querySelector('#actorSelect').disabled"); }
async function reload() { await evaluate('globalThis.__previousPublicDocument=true'); await command('Page.navigate', { url: base + '/workspace.html?storage=browser&test=' + Date.now() }); await wait("!globalThis.__previousPublicDocument && document.readyState==='complete' && document.querySelector('#actorSelect') && !document.querySelector('#actorSelect').disabled"); }
const title = '체험판 검증 ' + Date.now(), checks = [];
const directory = resolve('docs/implementation/prd-v3/evidence');
try {
  await command('Runtime.enable'); await command('Network.enable'); await reload();
  assert(await evaluate("document.querySelector('.demo-banner').textContent.includes('실제 검토 접수는 전송되지 않습니다')"));
  await role('customer-a'); await click('#newProjectButton'); await fill('title', title);
  await evaluate("globalThis.__originalIdbPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('Synthetic quota failure','QuotaExceededError')}");
  await submit(); await wait("document.querySelector('.form-error').textContent.length>0");
  assert.equal(await evaluate("document.querySelector('#workspaceDialog [name=title]').value"), title);
  await evaluate('IDBObjectStore.prototype.put=globalThis.__originalIdbPut'); await submit(); await saved();
  await wait(`document.querySelector('.project-heading h2')?.textContent===${JSON.stringify(title)}`);
  checks.push('Storage write failure preserves input and a retry creates one local business');
  await click('[data-action=candidate]'); await fill('name', '체험 후보지'); await fill('address', '개인정보 없는 예시 주소'); await fill('priceWon', '0'); await fill('memo', '허가 확정이 아닌 사전 검토 체험'); await submit(); await saved();
  await wait("document.querySelectorAll('.candidate-card').length===1");
  await click('[data-action=submit]'); await fill('question', '예시 부지 검토 체험입니다.'); await click('#workspaceDialog [name=consent]'); await submit(); await saved();
  await wait("document.querySelector('.receipt')?.textContent.startsWith('DEMO-')");
  const receipt = await evaluate("document.querySelector('.receipt').textContent");
  checks.push('A local example candidate produces a clearly marked DEMO receipt');
  await role('manager'); await click('[data-action=assign]'); await fill('assigneeId', 'staff-a'); await fill('reason', '체험 배정'); await submit(); await saved();
  await role('staff-a'); await click('[data-action=transition]'); await fill('status', 'reviewing'); await fill('body', '검토 과정 체험'); await submit(); await saved();
  await click('[data-action=note]'); await fill('body', 'PUBLIC-DEMO-INTERNAL-NOTE'); await submit(); await saved();
  await click('[data-action=reply]'); await fill('body', '예시 답변입니다. 실제 담당기관 확인이 필요합니다.'); await fill('source', '체험 근거'); await fill('checkedBy', '체험 확인자'); await fill('checkedAt', '2026-11-07'); await submit(); await saved();
  await role('customer-a'); await wait("document.querySelector('.detail-heading .badge').textContent==='답변 완료'");
  assert(!await evaluate("document.querySelector('#workspaceApp').textContent.includes('PUBLIC-DEMO-INTERNAL-NOTE')"));
  checks.push('Local role views support assignment, reply and private-note separation');
  await reload(); assert.equal(await evaluate("document.querySelector('.receipt').textContent"), receipt);
  checks.push('Reload restores IndexedDB business and answer without a server');
  await click('[data-action=followup]'); await fill('body', '체험 재문의'); await submit(); await saved();
  await wait("document.querySelector('.detail-heading .badge').textContent==='재문의'");
  assert.equal(await evaluate("document.querySelector('.receipt').textContent"), receipt);
  await role('customer-b'); assert(!await evaluate(`document.querySelector('#workspaceApp').textContent.includes(${JSON.stringify(title)})`));
  await role('customer-a');
  checks.push('Followup retains DEMO receipt; sample customer B view excludes customer A records');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await click('[data-action=candidate][data-id]');
  assert(await evaluate("(()=>{const r=document.querySelector('#workspaceDialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})()"));
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await wait("!document.querySelector('#workspaceDialog').open"); assert(await evaluate("document.activeElement.matches('[data-action=candidate][data-id]')"));
  checks.push('390px layout and dialog fit; Escape restores focus');
  assert.deepEqual(apiRequests, []); assert.deepEqual(exceptions, []);
  checks.push('No workspace API requests, server writes or JavaScript exceptions');
  await mkdir(directory, { recursive: true }); await evaluate('scrollTo(0,0)');
  const picture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(resolve(directory, 'workspace-public-mobile.png'), Buffer.from(picture.data, 'base64'));
  const result = { ok: true, base, checks, workspaceApiRequests: apiRequests, exceptions, deployment: 'not published; static local preview only', storage: 'IndexedDB in this browser', actualContactSent: false };
  await writeFile(resolve(directory, 'public-browser-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result, null, 2));
} finally { socket.close(); }
