import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:40431';
const passwordFile = process.env.TEST_PASSWORD_FILE;
assert(passwordFile, 'Set TEST_PASSWORD_FILE to the isolated preview credential file');
const password = (await readFile(passwordFile, 'utf8')).trim();
const checks = [];

for (const method of ['GET', 'HEAD']) {
  for (const route of ['/admin', '/admin.html', '/assets%2F..%2Fadmin.html', '/%61dmin.html']) {
    const response = await fetch(base + route, { method, redirect: 'manual' });
    assert.equal(response.status, 302, `${method} ${route}`);
    assert.equal(response.headers.get('location'), '/admin/login');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert(!(await response.text()).includes('dashboard'));
  }
}
checks.push('Unauthenticated GET/HEAD and encoded aliases redirect without dashboard HTML');
for (const route of ['/admin/login', '/admin-login.html']) {
  const response = await fetch(base + route);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const text = await response.text();
  assert(text.includes('관리자 로그인'));
  assert(!text.includes('id="dashboard"'));
}
checks.push('Login document contains no management dashboard');
for (const route of ['products', 'content', 'analytics', 'feedback', 'consultations']) {
  const response = await fetch(`${base}/api/admin/${route}`);
  assert.equal(response.status, 401, route);
}
checks.push('All management data APIs deny unauthenticated access');
const catalog = await (await fetch(base + '/api/products')).json();
assert(catalog.products.length > 0);
for (const image of new Set(catalog.products.map(product => product.image).filter(Boolean))) {
  assert(image.startsWith('/product-images/'), image);
  const response = await fetch(base + image);
  assert.equal(response.status, 200, image);
  assert.match(response.headers.get('content-type'), /^image\//, image);
  assert((await response.arrayBuffer()).byteLength > 100);
}
checks.push('Every public product image is same-origin and returns image content');
const page = await (await fetch(base)).text();
assert(!/<img[^>]+src="https?:/i.test(page), 'Guide banners must also be local');
checks.push('Guide banners do not request external image servers');
const wrongLogin = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'invalid-isolated-password' }) });
assert.equal(wrongLogin.status, 401);
const login = await fetch(base + '/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
assert.equal(login.status, 200);
assert.equal((await login.json()).authenticated, true);
const cookie = login.headers.get('set-cookie').split(';')[0];
assert(cookie.startsWith('sonsecha_admin='));
const headers = { cookie };
const dashboard = await fetch(base + '/admin.html', { headers });
assert.equal(dashboard.status, 200);
assert.match(dashboard.headers.get('cache-control'), /no-store/);
assert((await dashboard.text()).includes('id="dashboard"'));
const loginRedirect = await fetch(base + '/admin/login', { headers, redirect: 'manual' });
assert.equal(loginRedirect.status, 302);
assert.equal(loginRedirect.headers.get('location'), '/admin.html');
assert.equal((await fetch(base + '/api/admin/consultations', { headers })).status, 200);
checks.push('Correct login grants dashboard and management API access');
assert.equal((await fetch(base + '/api/admin/logout', { method: 'POST', headers })).status, 200);
assert.equal((await fetch(base + '/admin.html', { headers, redirect: 'manual' })).status, 302);
assert.equal((await fetch(base + '/api/admin/consultations', { headers })).status, 401);
checks.push('Logout revokes dashboard and API access');
console.log(JSON.stringify({ ok: true, checks }));
