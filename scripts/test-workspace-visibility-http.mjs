import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL;
assert(base && ['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Only the isolated local test server is allowed');
const checks = [];
const page = await fetch(base + '/workspace.html');
assert.equal(page.status, 200);
const html = await page.text();
assert.match(html, /준비 중인 기능입니다/);
assert.match(html, /<meta[^>]+name="robots"[^>]+content="noindex,nofollow"/);
assert.match(html, /id="workspaceFeature" hidden/);
assert.match(html, /href="\.\/index\.html">첫 화면으로 돌아가기/);
checks.push('Workspace holding document returns 200, noindex, static message and home link');
const root = await (await fetch(base + '/')).text();
assert.match(root, /<a[^>]+data-workspace-link[^>]+hidden/);
checks.push('The menu link remains in source and is hidden in the initial HTML');
for (const route of ['demo', 'demo/actor', 'projects', 'staff', 'inquiries/example', 'attachments/example']) {
  for (const method of ['GET', 'POST']) {
    const response = await fetch(`${base}/api/workspace/${route}`, { method, ...(method === 'POST' ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actorId: 'manager' }) } : {}) });
    assert.equal(response.status, 401, `${method} ${route}`);
    assert.match((await response.json()).error, /^관리자 로그인이 필요합니다\.?$/);
    assert(!response.headers.get('set-cookie'));
  }
}
checks.push('12 workspace API attempts stay 401; role selection cannot create a session');
for (const name of ['favicon.svg', 'favicon.ico']) {
  const response = await fetch(base + '/' + name); assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL('../public/' + name, import.meta.url)));
}
for (const route of ['/admin', '/admin.html']) {
  const response = await fetch(base + route, { redirect: 'manual' }); assert.equal(response.status, 302); assert.equal(response.headers.get('location'), '/admin/login');
}
checks.push('Favicon bytes and admin login redirects remain unchanged');
console.log(JSON.stringify({ ok: true, checks, workspaceApiAttempts: 12, workspaceApiStatus: 401, productionDataUsed: false }));
