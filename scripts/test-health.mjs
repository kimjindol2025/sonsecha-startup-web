import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:40330';
const response = await fetch(`${base}/healthz`);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { status: 'ok', service: 'sonsecha-startup-web' });
console.log(JSON.stringify({ ok: true, base, check: 'healthz' }));
