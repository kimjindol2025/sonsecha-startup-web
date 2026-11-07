import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.env.TEST_BASE_URL;
assert(base && ['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Only an isolated local preview is allowed');
const targets = await (await fetch(`http://127.0.0.1:${process.env.CHROME_DEBUG_PORT || 9229}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && t.url.startsWith(base)); assert(target, 'Open a dedicated local test tab first');
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let next = 0; const pending = new Map(), workspaceRequests = [], exceptions = [];
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('/api/workspace/')) workspaceRequests.push(m.params.request.url);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  const item = pending.get(m.id); if (!item) return; pending.delete(m.id); clearTimeout(item.timer);
  if (m.error) item.reject(Error(m.error.message)); else item.resolve(m.result);
};
const command = (method, params = {}) => new Promise((resolveCommand, reject) => { const id = ++next, timer = setTimeout(() => { pending.delete(id); reject(Error('Timeout: ' + method)); }, 10000); pending.set(id, { resolve: resolveCommand, reject, timer }); ws.send(JSON.stringify({ id, method, params })); });
async function evaluate(expression) { const r = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails)); return r.result.value; }
async function wait(expression) { for (let i = 0; i < 160; i++) { try { if (await evaluate(`Boolean(${expression})`)) return; } catch (e) { if (!/context|document|Cannot read/.test(e.message)) throw e; } await new Promise(r => setTimeout(r, 50)); } assert.fail('Timed out: ' + expression); }
async function navigate(path, expression) { await evaluate('globalThis.__oldVisibilityDocument=true'); await command('Page.navigate', { url: base + path }); await wait(`!globalThis.__oldVisibilityDocument && document.readyState==='complete' && (${expression})`); }
const directory = resolve(process.env.TEST_EVIDENCE_DIR || 'docs/qa/workspace-visibility'); await mkdir(directory, { recursive: true });
async function screenshot(name) { await evaluate('scrollTo(0,0)'); const r = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile(resolve(directory, name), Buffer.from(r.data, 'base64')); }
const checks = [];
const hiddenMenu = "[...document.querySelectorAll('a[href*=\"workspace.html\"]')].every(a=>a.hidden && a.getClientRects().length===0)";
const ready = "document.querySelector('#workspaceUnavailableTitle')?.textContent==='준비 중인 기능입니다' && document.querySelector('#workspaceFeature').hidden";
try {
  await command('Runtime.enable'); await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/?visibility=desktop', "document.querySelectorAll('.step-card').length===12");
  assert(await evaluate(hiddenMenu)); await screenshot('desktop-home.png'); checks.push('Desktop home: workspace link is hidden; 12 steps still render');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/?visibility=mobile', "document.querySelectorAll('.step-card').length===12");
  await evaluate("document.querySelector('#menuToggle').click()");
  assert(await evaluate("document.querySelector('#menuToggle').getAttribute('aria-expanded')==='true'"));
  assert(await evaluate(hiddenMenu)); assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await screenshot('mobile-home-menu.png'); checks.push('390px expanded menu: workspace link is hidden; no horizontal overflow');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('/workspace.html', ready);
  assert(await evaluate("document.querySelector('#workspaceUnavailable').getClientRects().length>0"));
  assert(await evaluate("document.querySelector('meta[name=robots]').content==='noindex,nofollow'"));
  assert(!await evaluate("document.body.innerText.includes('로컬 시험 환경')"));
  assert(!await evaluate("document.querySelector('#actorSelect').getClientRects().length"));
  await screenshot('desktop-workspace.png'); checks.push('Direct workspace: static holding message, home button, noindex, no visible role switch');
  const databaseNames = await evaluate("indexedDB.databases().then(items=>items.map(i=>i.name))");
  assert(!databaseNames.includes('sonsecha-workspace-experience-v1'));
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate('/workspace.html?storage=browser&enabled=true', ready);
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await screenshot('mobile-workspace.png');
  assert.deepEqual(workspaceRequests, []); checks.push('Query parameters cannot enable the workspace; no workspace API calls or demo database initialization');
  await evaluate("document.querySelector('.workspace-home-button').focus()");
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait("location.pathname==='/index.html' && document.querySelector('#menuToggle')");
  assert(await evaluate(hiddenMenu)); checks.push('Keyboard activation of home button returns to the existing first page');
  await command('Emulation.setScriptExecutionDisabled', { value: true });
  await command('Page.navigate', { url: base + '/workspace.html?no-js=1' });
  await wait("document.readyState==='complete' && document.querySelector('#workspaceUnavailableTitle')");
  assert(await evaluate(ready));
  await command('Page.navigate', { url: base + '/?no-js=1' });
  await wait("document.readyState==='complete' && document.querySelector('[data-workspace-link]')");
  assert(await evaluate(hiddenMenu)); checks.push('Without JavaScript: holding page and hidden initial menu still work');
  assert.deepEqual(exceptions, []);
  const result = { ok: true, base, checks, workspaceApiRequests: workspaceRequests, exceptions, screenshots: ['desktop-home.png','mobile-home-menu.png','desktop-workspace.png','mobile-workspace.png'], environment: 'isolated local copy; not deployed' };
  await writeFile(resolve(directory, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n'); console.log(JSON.stringify(result, null, 2));
} finally { await command('Emulation.setScriptExecutionDisabled', { value: false }).catch(() => {}); ws.close(); }
