import assert from 'node:assert/strict';

const debuggerPort = process.env.CHROME_DEBUG_PORT || '9231';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:40432';
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
  const handlers = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) handlers.reject(new Error(message.error.message));
  else handlers.resolve(message.result);
};

function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function waitFor(expression, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { if (await evaluate(`Boolean(${expression})`)) return; } catch { /* rendering */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}

async function navigate(url) {
  await command('Page.navigate', { url });
  await waitFor('document.readyState === "complete"');
}

async function setField(path, value, change = false) {
  await evaluate(`(() => {
    const field = document.querySelector('[data-plan-path=${JSON.stringify(path)}]');
    field.value = ${JSON.stringify(value)};
    field.dispatchEvent(new Event('input', { bubbles: true }));
    ${change ? "field.dispatchEvent(new Event('change', { bubbles: true }));" : ''}
  })()`);
}

await command('Page.enable');
await command('Runtime.enable');
await navigate(`${base}/#plan`);
await evaluate(`(() => {
  localStorage.removeItem('sonsecha-business-plans-v1');
  localStorage.setItem('sonsecha-candidates-v2', JSON.stringify({
    activeId: 'candidate-browser-1',
    candidates: [{
      id: 'candidate-browser-1', name: '양주 테스트 후보지', address: '경기도 양주시 옥정동 100',
      status: 'conditional', washType: '손세차+디테일링', bayCount: '2',
      stepChecks: ['1','2','3'], stepStatuses: { '1': 'conditional', '2': 'possible' }, detailChecks: [],
      detailNotes: { '1-0': '용도지역 확인 필요', '2-0': '건축사 문의 예정' }, consultationNotes: []
    }]
  }));
  location.reload();
})()`);
await waitFor("document.querySelector('#businessPlanApp .plan-hero')");

assert.equal(await evaluate("document.body.classList.contains('plan-view')"), true);
assert.equal(await evaluate("document.querySelector('[data-view-tab=plan]').classList.contains('active')"), true);
assert.equal(await evaluate("document.querySelectorAll('.plan-source-card').length"), 4);
assert.equal(await evaluate("[...document.querySelectorAll('.plan-source-card a')].every(a => a.target === '_blank')"), true);

await setField('linkedCandidateId', 'candidate-browser-1', true);
await waitFor("document.querySelector('.plan-candidate-summary')");
await evaluate("document.querySelector('[data-plan-action=import-candidate]').click()");
await waitFor("document.querySelector('[data-plan-path=\"basic.siteAddress\"]').value.includes('양주시')");
assert.equal(await evaluate("document.querySelector('.plan-candidate-summary').textContent.includes('3/12')"), true);
assert.equal(await evaluate("document.querySelector('.plan-candidate-summary').textContent.includes('조건부 가능')"), true);

await setField('funding.own', '80000000');
await setField('funding.loan', '100000000');
await setField('basic.floorArea', '80');
await setField('basic.preparationMonths', '6');
await setField('basic.constructionWeeks', '8');
await setField('basic.openingDate', '2027-03-01');
await setField('basic.businessDescription', '예약 중심 2베이 손세차와 디테일링 서비스를 운영한다.');
await setField('research.targetCustomers', '옥정동 거주자와 인근 출퇴근 차량');
await setField('research.competitorMemo', '반경 3km 업체 가격과 예약 여부 비교 예정');
await setField('research.trafficMemo', '주도로 우회전 진입과 대기 차량 동선을 현장에서 확인한다.');
await setField('research.risks', '용도변경과 폐수처리 공사비를 확정하지 못했다.');
await setField('actionPlan', '건축사 현장 확인 후 관할 환경부서에 문의한다.');
assert.equal(await evaluate("document.querySelector('[data-document-section=business]').textContent.includes('예약 중심 2베이')"), true);
assert.equal(await evaluate("document.querySelector('[data-document-section=market]').textContent.includes('인근 출퇴근 차량')"), true);
await evaluate("document.querySelector('[data-plan-action=fill-budget-example]').click()");
await waitFor("document.querySelector('[data-plan-total=budget]').textContent === '186,500,000원'");
assert.equal(await evaluate("document.querySelector('[data-plan-total=funding]').textContent"), '180,000,000원');
assert.equal(await evaluate("document.querySelector('[data-plan-gap-card]').classList.contains('negative')"), true);
assert.equal(await evaluate("document.querySelector('[data-plan-total=gap]').textContent"), '6,500,000원');

await evaluate("document.querySelector('[data-plan-action=fill-sales-example]').click()");
await waitFor("document.querySelector('[data-plan-total=sales]').textContent === '9,100,000원'");
assert.equal(await evaluate("document.querySelector('[data-plan-total=costs]').textContent"), '7,600,000원');
assert.equal(await evaluate("document.querySelector('[data-plan-total=profit]').textContent"), '1,500,000원');
assert.equal(await evaluate("document.querySelector('[data-plan-total=break-even]').textContent"), '하루 9대');
assert.equal(await evaluate("document.querySelectorAll('[data-plan-document] > section').length"), 12);
assert.equal(await evaluate("document.querySelector('[data-document-section=budget]').textContent.includes('바닥·방수·배수 공사')"), true);
assert.equal(await evaluate("document.querySelector('[data-document-section=budget]').textContent.includes('폐수처리·배관')"), true);
assert.equal(await evaluate("document.querySelector('[data-document-section=funding]').textContent.includes('추가 확보 필요')"), true);
assert.equal(await evaluate("document.querySelector('[data-document-section=sales]').textContent.includes('카드·플랫폼 수수료')"), true);
assert.equal(await evaluate("document.querySelectorAll('.plan-document-stages li').length"), 12);
assert.equal(await evaluate("document.querySelector('.plan-document-stages').textContent.includes('조건부 가능')"), true);
assert.equal(await evaluate("document.querySelectorAll('.plan-document-notes li').length"), 2);
assert.equal(await evaluate("document.querySelector('[data-document-section=action]').textContent.includes('관할 환경부서')"), true);
assert.equal(await evaluate("document.querySelector('[data-document-section=missing]').textContent.includes('작성자·예비 대표')"), true);

const firstPlanId = await evaluate("JSON.parse(localStorage.getItem('sonsecha-business-plans-v1')).activeId");
await evaluate("document.querySelector('[data-plan-action=new]').click()");
await waitFor("document.querySelector('[data-plan-select]').options.length === 2");
await setField('basic.targetRegion', '경기도 의정부시');
assert.equal(await evaluate("JSON.parse(localStorage.getItem('sonsecha-business-plans-v1')).plans.length"), 2);
await evaluate(`(() => { const select = document.querySelector('[data-plan-select]'); select.value = ${JSON.stringify(firstPlanId)}; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await waitFor("document.querySelector('[data-plan-path=\"basic.siteAddress\"]').value.includes('양주시')");
assert.equal(await evaluate("document.querySelector('[data-plan-path=\"basic.targetRegion\"]').value.includes('양주시')"), true);

await evaluate('location.reload()');
await waitFor("document.querySelector('#businessPlanApp .plan-hero')");
assert.equal(await evaluate("document.querySelector('[data-plan-path=\"basic.siteAddress\"]').value.includes('양주시')"), true);
assert.equal(await evaluate("document.querySelector('[data-plan-total=budget]').textContent"), '186,500,000원');

await evaluate("document.body.classList.add('printing-business-plan')");
await command('Emulation.setEmulatedMedia', { media: 'print' });
assert.equal(await evaluate("getComputedStyle(document.querySelector('.plan-document')).display !== 'none'"), true);
assert.equal(await evaluate("getComputedStyle(document.querySelector('.plan-hero')).display === 'none'"), true);
assert.equal(await evaluate("getComputedStyle(document.querySelector('.site-header')).display === 'none'"), true);
await command('Emulation.setEmulatedMedia', { media: 'screen' });
await evaluate("document.body.classList.remove('printing-business-plan')");

await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await new Promise((resolve) => setTimeout(resolve, 250));
assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
assert.equal(await evaluate("document.querySelector('.plan-toolbar').getBoundingClientRect().right <= window.innerWidth"), true);
assert.equal(await evaluate("document.querySelector('.plan-document').getBoundingClientRect().right <= window.innerWidth"), true);

await command('Emulation.clearDeviceMetricsOverride');
socket.close();
console.log('browser business plan smoke: PASS');
