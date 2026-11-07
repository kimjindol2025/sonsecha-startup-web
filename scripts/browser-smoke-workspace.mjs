import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_BASE_URL;
assert(base && ['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Only an explicit local demo TEST_BASE_URL is allowed');
assert.equal((await (await fetch(base + '/api/workspace/demo')).json()).demo, true);
const port = process.env.CHROME_DEBUG_PORT || '9229';
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find(t => t.type === 'page' && t.url.startsWith(base + '/'));
assert(target, 'Open a dedicated preview tab first');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { socket.onopen = r; socket.onerror = j; });
let sequence = 0; const pending = new Map(); const warnings = [], exceptions = [];
socket.onmessage = event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Log.entryAdded' && /aria-hidden|retained focus/.test(message.params.entry.text)) warnings.push(message.params.entry.text);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  const item = pending.get(message.id); if (!item) return;
  pending.delete(message.id); clearTimeout(item.timer);
  if (message.error) item.reject(Error(message.error.message)); else item.resolve(message.result);
};
function command(method, params = {}) {
  return new Promise((resolveCommand, reject) => {
    const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 10000);
    pending.set(id, { resolve: resolveCommand, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails)); return result.result.value;
}
async function wait(expression) {
  for (let i = 0; i < 160; i++) {
    try { if (await evaluate(`Boolean(${expression})`)) return; } catch (e) { if (!/context|document|Cannot read/.test(e.message)) throw e; }
    await new Promise(r => setTimeout(r, 50));
  }
  assert.fail('Timed out: ' + expression);
}
async function click(selector) {
  const point = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing button');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await command('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await command('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
async function fill(name, value) {
  await evaluate(`{const el=document.querySelector('#workspaceDialog [name="${name}"]');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}`);
}
async function submit() { await click('#workspaceDialog [type=submit]'); }
async function saved() { await wait("!document.querySelector('#workspaceDialog').open"); await wait("!document.querySelector('#globalStatus').classList.contains('error')"); }
async function role(actorId) {
  await evaluate(`{const el=document.querySelector('#actorSelect');el.value=${JSON.stringify(actorId)};el.dispatchEvent(new Event('change',{bubbles:true}));}`);
  await wait(`!document.querySelector('#actorSelect').disabled && document.querySelector('#actorSelect').value === ${JSON.stringify(actorId)}`);
}
async function proof() {
  await fill('source', '브라우저 시험용 회신 문서'); await fill('checkedBy', '시험 담당 주체'); await fill('checkedAt', '2026-11-07');
  await click('#workspaceDialog [name=recheck]'); await fill('recheckReason', '실제 담당기관에 추가 확인 필요');
}
const checks = [], stamp = Date.now();
const title = `동두천 창업 검토 ${String(stamp).slice(-4)}`;
const evidence = resolve(process.env.TEST_EVIDENCE_DIR || 'docs/implementation/prd-v3/evidence');
try {
  await command('Runtime.enable'); await command('Log.enable'); await command('Log.clear'); await command('Network.enable');
  await evaluate('globalThis.__oldWorkspaceSmokeDocument=true');
  await command('Page.navigate', { url: `${base}/workspace.html?smoke=${stamp}` });
  await wait("!globalThis.__oldWorkspaceSmokeDocument && document.readyState==='complete' && document.querySelector('#actorSelect') && !document.querySelector('#actorSelect').disabled");
  await wait("!document.querySelector('#actorSelect').disabled");
  await role('customer-a');
  await click('#newProjectButton'); await fill('title', title); await submit(); await saved();
  await wait(`document.querySelector('.project-heading h2')?.textContent === ${JSON.stringify(title)}`);
  const projectId = await evaluate("document.querySelector('.project-link.active').dataset.id");
  await click('[data-action=candidate]'); await fill('name', '브라우저 후보지'); await fill('address', '개인정보 없는 시험 주소'); await fill('priceWon', '0'); await fill('memo', '내가 작성한 후보지 메모');
  await command('Network.setBlockedURLs', { urls: [base + `/api/workspace/projects/${projectId}/candidates`] });
  await submit(); await wait("document.querySelector('.form-error').textContent.includes('통신')");
  assert.equal(await evaluate("document.querySelector('#workspaceDialog [name=name]').value"), '브라우저 후보지');
  assert(!await evaluate("document.querySelector('.save-status').textContent.includes('저장 완료')"));
  await command('Network.setBlockedURLs', { urls: [] }); await submit(); await saved();
  await wait("document.querySelectorAll('.candidate-card').length===1");
  assert(await evaluate("document.activeElement.matches('[data-action=candidate]:not([data-id])')"));
  checks.push('A09: failed network save retains input and retry saves one candidate');
  const candidateId = await evaluate("document.querySelector('[data-action=submit]').dataset.id");
  const edit = `[data-action=candidate][data-id="${candidateId}"]`;
  await click(edit); await fill('memo', '오래된 화면의 보존할 입력');
  await evaluate(`fetch('/api/workspace/projects/${projectId}/candidates/${candidateId}',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:${JSON.stringify(randomUUID())},version:1,name:'브라우저 후보지',address:'개인정보 없는 시험 주소',memo:'다른 화면에서 저장한 최신 메모',priceWon:0})}).then(r=>r.json())`);
  await submit(); await wait("document.querySelector('.form-error').textContent.includes('다른 화면')");
  assert.equal(await evaluate("document.querySelector('#workspaceDialog [name=memo]').value"), '오래된 화면의 보존할 입력');
  await click('.form-error button'); await wait("document.querySelector('.form-error').textContent.includes('다른 화면에서 저장한 최신 메모')");
  await click('.form-error button'); await submit(); await saved();
  checks.push('A24: stale draft conflict preserves input and requires explicit latest-version acknowledgement');
  await click(`[data-action=submit][data-id="${candidateId}"]`); await fill('question', '이 부지의 허가 미확인 사항을 검토해 주세요.');
  await click('#workspaceDialog [name=consent]'); await submit(); await saved();
  await wait("document.querySelector('.receipt')?.textContent.startsWith('SWR-')");
  const receipt = await evaluate("document.querySelector('.receipt').textContent");
  await click('[data-action=upload]');
  const photoPath = resolve('/tmp', `sonsecha-workspace-${stamp}.png`);
  await writeFile(photoPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
  const document = await command('DOM.getDocument'); const fileNode = await command('DOM.querySelector', { nodeId: document.root.nodeId, selector: '#workspaceDialog input[type=file]' });
  await command('DOM.setFileInputFiles', { nodeId: fileNode.nodeId, files: [photoPath] }); await submit(); await saved();
  await wait("document.querySelector('.attachment-list a')"); checks.push('Attachment is selected and stored through the actual photo form');
  await role('customer-b'); assert(!await evaluate(`document.querySelector('#workspaceApp').textContent.includes(${JSON.stringify(title)})`));
  checks.push('Customer B does not see customer A business');
  await role('manager'); await wait(`document.querySelector('.project-heading h2')?.textContent === ${JSON.stringify(title)}`);
  await click('[data-action=assign]'); await fill('assigneeId','staff-a'); await fill('reason','INTERNAL-ASSIGNMENT-BROWSER'); await submit(); await saved();
  await role('staff-a'); await wait("document.querySelector('[data-action=transition]')");
  await click('[data-action=transition]'); await fill('status','reviewing'); await fill('body','검토를 시작합니다.'); await submit(); await saved();
  await wait("document.querySelector('[data-action=review]')"); await click('[data-action=review]'); await fill('body','토지 조건에 대한 시험 기록'); await proof(); await submit(); await saved();
  await wait("document.querySelectorAll('.review-record').length===1");
  await click('[data-action=note]'); await fill('body','INTERNAL-BROWSER-NOTE'); await submit(); await saved();
  await wait("document.querySelector('.thread-entry.note')");
  await click('[data-action=reply]'); await fill('body','시험 검토 결과입니다. 담당기관과 현장 확인이 더 필요합니다.'); await proof(); await submit(); await saved();
  await wait("document.querySelector('.detail-heading .badge').textContent==='답변 완료'");
  checks.push('A01 A16: manager assignment, manual review evidence and staff public reply work through forms');
  await role('customer-a'); await wait("document.querySelector('.detail-heading .badge').textContent==='답변 완료'");
  const customerText = await evaluate("document.querySelector('#workspaceApp').textContent");
  assert(!customerText.includes('INTERNAL-BROWSER-NOTE')); assert(!customerText.includes('INTERNAL-ASSIGNMENT-BROWSER'));
  checks.push('A12: customer screen excludes staff notes and internal assignment reason');
  await evaluate('globalThis.__oldWorkspaceDocument=true'); await command('Page.reload'); await wait("!globalThis.__oldWorkspaceDocument && document.readyState==='complete' && !document.querySelector('#actorSelect').disabled");
  assert.equal(await evaluate("document.querySelector('.receipt').textContent"),receipt);
  assert.equal(await evaluate("document.querySelector('.detail-heading .badge').textContent"),'답변 완료');
  checks.push('Page reload restores saved customer result without implementing login');
  await click('[data-action=followup]'); await fill('body','추가로 확인할 부분이 있습니다.'); await submit(); await saved();
  await wait("document.querySelector('.detail-heading .badge').textContent==='재문의'");
  assert.equal(await evaluate("document.querySelector('.receipt').textContent"),receipt);
  assert(await evaluate("document.querySelector('#inquiryDetail').textContent.includes('시험 검토 결과입니다.')"));
  checks.push('A13: followup preserves receipt and previous answer');
  await role('manager'); await click('[data-action=assign]'); await fill('assigneeId','staff-b'); await fill('reason','브라우저 재배정 시험'); await submit(); await saved();
  await role('staff-a'); assert(!await evaluate(`document.querySelector('#workspaceApp').textContent.includes(${JSON.stringify(title)})`));
  await role('staff-b'); await wait(`document.querySelector('.project-heading h2')?.textContent===${JSON.stringify(title)}`);
  checks.push('A11: prior staff loses the business view and replacement staff receives it');
  await role('customer-a');
  await mkdir(evidence,{recursive:true});
  await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate('scrollTo(0,0)');
  const desktop = await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}); await writeFile(resolve(evidence,'workspace-desktop.png'),Buffer.from(desktop.data,'base64'));
  await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  await click(edit); await wait("document.querySelector('#workspaceDialog').open");
  assert(await evaluate("(()=>{const r=document.querySelector('#workspaceDialog').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()"));
  for (let tab=0;tab<16;tab++) {
    await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert(await evaluate("document.querySelector('#workspaceDialog').contains(document.activeElement)"));
  }
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await wait("!document.querySelector('#workspaceDialog').open");
  assert(await evaluate(`document.activeElement.matches(${JSON.stringify(edit)})`));
  checks.push('A18: 390px page and dialog fit, Tab stays in dialog, Escape and successful save restore focus');
  await evaluate('scrollTo(0,0)');
  const mobile=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(resolve(evidence,'workspace-mobile.png'),Buffer.from(mobile.data,'base64'));
  assert.deepEqual(warnings,[]);assert.deepEqual(exceptions,[]);
  const result={ok:true,base,checks,warnings,exceptions,login:'deferred by user; no authentication acceptance claimed',screenshots:['workspace-desktop.png','workspace-mobile.png']};
  await writeFile(resolve(evidence,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
} finally { await command('Network.setBlockedURLs',{urls:[]}).catch(()=>{});socket.close(); }
