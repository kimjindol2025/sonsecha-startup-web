import assert from 'node:assert/strict';

const debuggerPort = process.env.CHROME_DEBUG_PORT || '9229';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:40431';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || '';
if (!adminPassword) throw new Error('TEST_ADMIN_PASSWORD is required');

async function api(path, options = {}, cookie = '') {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${payload.error || ''}`);
  return { response, payload };
}

const login = await api('/api/admin/login', {
  method: 'POST',
  body: JSON.stringify({ password: adminPassword }),
});
const cookie = (login.response.headers.get('set-cookie') || '').split(';')[0];
const adminProducts = await api('/api/admin/products', {}, cookie);
assert.ok(adminProducts.payload.products.length >= 2);
const detailProduct = adminProducts.payload.products.find((product) => product.active !== false && product.inStock !== false);
const hiddenProduct = adminProducts.payload.products.find((product) => product.id !== detailProduct?.id);
assert.ok(detailProduct);
assert.ok(hiddenProduct);
const detailText = '브라우저 상세 설명 저장 확인\n\n설치 전 전기·급수·배수 조건을 확인합니다.';

await api(`/api/admin/products/${encodeURIComponent(detailProduct.id)}`, {
  method: 'PUT',
  body: JSON.stringify({ ...detailProduct, details: detailText }),
}, cookie);
await api(`/api/admin/products/${encodeURIComponent(hiddenProduct.id)}`, {
  method: 'PUT',
  body: JSON.stringify({ ...hiddenProduct, active: false }),
}, cookie);
const publicProducts = await api('/api/products');
assert.equal(publicProducts.payload.products.find((item) => item.id === detailProduct.id)?.details, detailText);
assert.equal(publicProducts.payload.products.some((item) => item.id === hiddenProduct.id), false);

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
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function waitFor(expression, timeout = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await evaluate(`Boolean(${expression})`)) return;
    } catch { /* page may be rendering */ }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out: ${expression}`);
}

async function navigate(url) {
  await command('Page.navigate', { url });
  await waitFor('document.readyState === "complete"');
}

const selector = (value) => JSON.stringify(value);
const click = (value) => evaluate(`document.querySelector(${selector(value)}).click()`);
const cardSelector = `[data-product-id="${detailProduct.id}"]`;
const hiddenCardSelector = `[data-product-id="${hiddenProduct.id}"]`;

await command('Page.enable');
await command('Runtime.enable');
await navigate(`${base}/#shop`);
await evaluate('localStorage.removeItem("sonsecha-shop-cart-v1"); location.reload()');
await waitFor(`document.querySelector(${selector(cardSelector)})`);
assert.equal(await evaluate(`document.querySelector(${selector(hiddenCardSelector)}) === null`), true);

await click(`${cardSelector} [data-product-detail]`);
await waitFor(`location.hash === ${JSON.stringify(`#shop/product/${encodeURIComponent(detailProduct.id)}`)}`);
await waitFor('document.querySelector("#productDetailView:not([hidden]) .product-detail-hero")');
assert.equal(await evaluate(`document.querySelector('#shopCatalogView').hidden`), true);
assert.equal(await evaluate(`document.querySelector('#productDetailView').textContent.includes(${JSON.stringify('브라우저 상세 설명 저장 확인')})`), true);
assert.equal(await evaluate(`document.title.includes(${JSON.stringify(detailProduct.name)})`), true);

await click('#productDetailView [data-add-product]');
await waitFor('document.body.classList.contains("cart-open")');
assert.equal(await evaluate(`JSON.parse(localStorage.getItem('sonsecha-shop-cart-v1')).some((item) => item.productId === ${JSON.stringify(detailProduct.id)})`), true);
await click('[data-cart-close]');
await waitFor('!document.body.classList.contains("cart-open")');

await evaluate('history.back()');
await waitFor('location.hash === "#shop" && !document.querySelector("#shopCatalogView").hidden');
assert.equal(await evaluate(`document.querySelector(${selector(cardSelector)}) !== null`), true);

await navigate(`${base}/#shop/product/${encodeURIComponent(detailProduct.id)}`);
await waitFor('document.querySelector("#productDetailView:not([hidden]) .product-detail-hero")');
await evaluate('location.reload()');
await waitFor(`document.querySelector('#productDetailView').textContent.includes(${JSON.stringify('브라우저 상세 설명 저장 확인')})`);

await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await new Promise((resolve) => setTimeout(resolve, 250));
assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
assert.equal(await evaluate(`document.querySelector('.product-detail-actions').getBoundingClientRect().right <= window.innerWidth`), true);

await navigate(`${base}/#shop/product/${encodeURIComponent(hiddenProduct.id)}`);
await waitFor('document.querySelector(".product-detail-empty")');
assert.equal(await evaluate(`document.querySelector('#productDetailView').textContent.includes('공개 중인 상품을 찾을 수 없습니다.')`), true);

await command('Emulation.clearDeviceMetricsOverride');
socket.close();
console.log('browser shop detail smoke: PASS');
