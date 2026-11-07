import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';

const root = resolve(import.meta.dirname, '..');
const data = await mkdtemp(join(tmpdir(), 'sonsecha-legacy-regression-'));
const password = randomBytes(30).toString('base64url'), salt = randomBytes(24).toString('hex');
await writeFile(join(data, 'admin-auth.json'), JSON.stringify({ algorithm: 'scrypt-v1', salt, hash: scryptSync(password, salt, 64).toString('hex'), updatedAt: new Date().toISOString() }), { mode: 0o600 });
const passwordFile = join(data, 'test-password'); await writeFile(passwordFile, password, { mode: 0o600 });
const probe = createServer(); await new Promise((r, j) => { probe.once('error', j); probe.listen(0, '127.0.0.1', r); }); const port = probe.address().port; await new Promise(r => probe.close(r));
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), ADMIN_DATA_DIR: data, NODE_ENV: 'test', TRUSTED_PROXY_IPS: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; server.stdout.on('data', d => { logs += d; }); server.stderr.on('data', d => { logs += d; });
const results = { ok: false, testBase: base, syntheticData: data, checks: [], productionDataUsed: false };
try {
  let ready = false;
  for (let n = 0; n < 100; n++) { if (server.exitCode !== null) throw Error('Isolated legacy server exited'); try { if ((await fetch(base + '/api/products')).ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 50)); }
  assert(ready, 'Isolated legacy server ready');
  const scripts = ['test-qa-regressions.mjs', 'test-consultations.mjs'];
  if (process.env.CHROME_DEBUG_PORT) scripts.push('browser-smoke-business-plan.mjs', 'browser-smoke-shop.mjs', 'browser-smoke-consultations.mjs', 'browser-smoke-cart.mjs');
  for (const script of scripts) {
    const run = spawnSync(process.execPath, ['scripts/' + script], { cwd: root, env: { ...process.env, TEST_BASE_URL: base, TEST_PASSWORD_FILE: passwordFile, TEST_ADMIN_PASSWORD: password }, encoding: 'utf8', timeout: 60000 });
    const output = ((run.stdout || '') + '\n' + (run.stderr || '')).replaceAll(password, '[redacted]').trim();
    results.checks.push({ command: 'node scripts/' + script, status: run.status === 0 ? 'passed' : 'failed', output });
    if (run.status !== 0) throw Error('Legacy regression failed: ' + script);
  }
  results.ok = true;
} catch (error) { results.error = error.message; process.exitCode = 1; }
finally {
  if (server.exitCode === null) { const closed = new Promise(r => server.once('exit', r)); server.kill('SIGTERM'); await closed; }
  results.ownTestServerStopped = true;
  await writeFile(resolve(root, 'docs/implementation/prd-v3/evidence/legacy-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ ok: results.ok, checks: results.checks.map(({ command, status }) => ({ command, status })), ownTestServerStopped: true, ...(results.error ? { error: results.error, output: results.checks.at(-1)?.output } : {}) }, null, 2));
}
