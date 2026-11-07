import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'https://sonsecha.dclub.kr';
const debugPort = process.env.CHROME_DEBUG_PORT || '9229';
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const target = targets.find((entry) => entry.type === 'page' && entry.url.startsWith(base));
assert(target, `Open a dedicated browser tab at ${base} first`);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let sequence = 0;
const pending = new Map();
const warnings = [];
const exceptions = [];
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Log.entryAdded' && /aria-hidden|retained focus/i.test(message.params.entry.text)) warnings.push(message.params.entry.text);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  clearTimeout(handler.timer);
  if (message.error) handler.reject(new Error(message.error.message));
  else handler.resolve(message.result);
};
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if (await evaluate(`Boolean(${expression})`)) return;
    } catch (error) {
      if (!/context|document|Cannot read properties/i.test(error.message)) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail(`Timed out: ${expression}`);
}
async function click(selector) {
  await evaluate(`{ const element = document.querySelector(${JSON.stringify(selector)}); element.focus(); element.click(); }`);
}
const opener = '.shop-cart-button';
const close = '#cartDrawer [data-cart-close]';
const checks = [];
try {
  await command('Log.enable');
  await command('Log.clear');
  await command('Runtime.enable');
  await evaluate('globalThis.__cartSmokeOldDocument = true');
  await command('Page.navigate', { url: `${base}/?cart-smoke=${Date.now()}#shop` });
  await waitFor("!globalThis.__cartSmokeOldDocument && document.readyState === 'complete'");
  await waitFor("document.querySelector('[data-add-product]') && document.body.classList.contains('shop-view')");
  assert(await evaluate("document.querySelector('#cartDrawer').inert"));
  await evaluate(`document.querySelector(${JSON.stringify(close)}).focus()`);
  assert(await evaluate("!document.querySelector('#cartDrawer').contains(document.activeElement)"));
  checks.push('Closed cart rejects keyboard focus');
  for (const method of ['button', 'backdrop', 'Escape']) {
    await click(opener);
    await waitFor("document.activeElement.matches('#cartDrawer [data-cart-close]')");
    assert(await evaluate("!document.querySelector('#cartDrawer').inert"));
    if (method === 'button') await click(close);
    else if (method === 'backdrop') await click('.cart-backdrop');
    else {
      await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    }
    await waitFor("document.querySelector('.cart-backdrop').hidden");
    assert(await evaluate(`document.activeElement.matches(${JSON.stringify(opener)})`), `${method}: opener focus restored`);
    assert(await evaluate("document.querySelector('#cartDrawer').inert && document.querySelector('#cartDrawer').getAttribute('aria-hidden') === 'true'"));
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert(await evaluate("!document.querySelector('#cartDrawer').contains(document.activeElement)"));
    checks.push(`${method}: close restores focus and skips hidden controls`);
  }
  await click(opener);
  await waitFor("document.activeElement.matches('#cartDrawer [data-cart-close]')");
  await evaluate(`document.querySelector(${JSON.stringify(close)}).click(); document.querySelector(${JSON.stringify(opener)}).focus(); document.querySelector(${JSON.stringify(opener)}).click()`);
  await evaluate('new Promise(resolve => setTimeout(resolve, 320))');
  assert(await evaluate("!document.querySelector('.cart-backdrop').hidden && !document.querySelector('#cartDrawer').inert && document.querySelector('#cartDrawer').classList.contains('open')"));
  await click(close);
  await waitFor("document.querySelector('.cart-backdrop').hidden");
  checks.push('Rapid reopening keeps the backdrop visible');
  await click('[data-add-product]:not(:disabled)');
  await waitFor("document.activeElement.matches('#cartDrawer [data-cart-close]')");
  await click(close);
  assert(await evaluate("document.activeElement.matches('[data-add-product]')"));
  checks.push('Adding a product returns focus to its product button');
  await click(opener);
  await waitFor("document.activeElement.matches('#cartDrawer [data-cart-close]')");
  await click('#quoteOpenButton');
  await waitFor("document.querySelector('#quoteModal').classList.contains('open')");
  assert(await evaluate("document.querySelector('#cartDrawer').inert && document.querySelector('#cartDrawer').getAttribute('aria-hidden') === 'true'"));
  assert(await evaluate("!document.querySelector('#cartDrawer').contains(document.activeElement)"));
  checks.push('Quote handoff moves focus outside the closed cart');
  for (const [path, type] of [['/favicon.svg', 'image/svg+xml'], ['/favicon.ico', 'image/x-icon']]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), new RegExp(type.replace('+', '\\+')));
    assert((await response.arrayBuffer()).byteLength > 100);
  }
  checks.push('SVG and ICO favicons return valid image responses');
  assert.deepEqual(warnings, [], 'No aria-hidden focus warnings');
  assert.deepEqual(exceptions, [], 'No JavaScript exceptions');
  console.log(JSON.stringify({ ok: true, base, checks, warnings, exceptions }, null, 2));
} finally {
  socket.close();
}
