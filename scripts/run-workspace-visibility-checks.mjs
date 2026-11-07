import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, cp, copyFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createWorkspacePreview } from '../workspace-preview.mjs';

const root = resolve(import.meta.dirname, '..'), evidence = resolve(root, 'docs/qa/workspace-visibility');
await mkdir(evidence, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'sonsecha-visibility-'));
const data = join(temporary, 'legacy-data'); await mkdir(data, { mode: 0o700 });
const password = randomBytes(28).toString('base64url'), salt = randomBytes(24).toString('hex');
await writeFile(join(data, 'admin-auth.json'), JSON.stringify({ algorithm: 'scrypt-v1', salt, hash: scryptSync(password, salt, 64).toString('hex'), updatedAt: new Date().toISOString() }), { mode: 0o600 });
const passwordFile = join(data, 'test-password'); await writeFile(passwordFile, password, { mode: 0o600 });
const browserSession = 'sonsecha-visibility-check';
const results = { ok: false, checks: [], productionDataUsed: false, committed: false, pushed: false, deployed: false, existingProcessOperations: [], temporary, evidence };
function run(file, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(file, args, { cwd: options.cwd || root, env: { ...process.env, ...options.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', d => { output += d; }); child.stderr.on('data', d => { output += d; });
    const timer = setTimeout(() => { child.kill('SIGTERM'); }, options.timeout || 90000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => {
      clearTimeout(timer); output = output.replaceAll(password, '[redacted]');
      if (code !== 0) reject(Object.assign(Error(`${file} ${args[0] || ''}: ${code ?? signal}`), { output }));
      else resolveRun(output);
    });
  });
}
async function checked(name, file, args, options = {}) {
  try {
    const output = await run(file, args, options);
    results.checks.push({ name, status: 'passed', command: [file, ...args], output });
    console.log(JSON.stringify({ check: name, status: 'passed' })); return output;
  } catch (error) {
    results.checks.push({ name, status: 'failed', command: [file, ...args], output: error.output || error.message }); throw error;
  }
}
const probe = createServer(); await new Promise((r, j) => { probe.once('error', j); probe.listen(0, '127.0.0.1', r); }); const port = probe.address().port; await new Promise(r => probe.close(r));
const base = `http://127.0.0.1:${port}`; results.disabledBase = base;
const legacy = spawn(process.execPath, ['server.mjs'], { cwd: root, env: { ...process.env, NODE_ENV: 'test', PORT: String(port), ADMIN_DATA_DIR: data, TRUSTED_PROXY_IPS: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
legacy.stdout.resume(); legacy.stderr.resume();
let enabled;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) { if (legacy.exitCode !== null) throw Error('Isolated server exited'); try { if ((await fetch(base + '/api/products')).ok) { ready = true; break; } } catch {} await new Promise(r => setTimeout(r, 50)); }
  assert(ready);
  await run('agent-browser', ['--session', browserSession, 'open', base]);
  const cdp = (await run('agent-browser', ['--session', browserSession, 'get', 'cdp-url'])).trim();
  const debugPort = new URL(cdp.match(/ws:\/\/\S+/)[0]).port;
  const env = { TEST_BASE_URL: base, TEST_PASSWORD_FILE: passwordFile, TEST_ADMIN_PASSWORD: password, CHROME_DEBUG_PORT: debugPort, TEST_EVIDENCE_DIR: evidence };
  await checked('Workspace disabled HTTP contract', process.execPath, ['scripts/test-workspace-visibility-http.mjs'], { env });
  await checked('Desktop/mobile hidden menu and holding document', process.execPath, ['scripts/browser-smoke-workspace-visibility.mjs'], { env });
  for (const name of ['test-qa-regressions', 'test-consultations', 'browser-smoke-business-plan', 'browser-smoke-shop', 'browser-smoke-consultations', 'browser-smoke-cart']) {
    await checked('Existing regression: ' + name, process.execPath, ['scripts/' + name + '.mjs'], { env });
  }
  await checked('Retained workspace store and role guards: 20 tests', process.execPath, ['--test', 'scripts/test-workspace.mjs']);
  const enabledRoot = join(temporary, 'enabled-source'); await mkdir(enabledRoot);
  for (const name of ['README.md', 'package.json', 'package-lock.json', 'vite.config.js', 'index.html', 'admin.html', 'admin-login.html', 'workspace.html']) await copyFile(join(root, name), join(enabledRoot, name));
  for (const name of ['src', 'public', 'scripts', '.openai']) await cp(join(root, name), join(enabledRoot, name), { recursive: true });
  await run('cp', ['-a', join(root, 'node_modules'), join(enabledRoot, 'node_modules')]);
  const configPath = join(enabledRoot, 'src/site-features.js');
  const config = await readFile(configPath, 'utf8'); assert.equal(config.split('WORKSPACE_ENABLED = false').length, 2);
  await writeFile(configPath, config.replace('WORKSPACE_ENABLED = false', 'WORKSPACE_ENABLED = true'));
  await checked('Single flag enabled build in temporary copy', 'npm', ['run', 'build'], { cwd: enabledRoot });
  enabled = createWorkspacePreview({ dataDir: join(temporary, 'enabled-demo-data'), distDir: join(enabledRoot, 'dist'), demo: true, environment: 'test' });
  const enabledBase = await enabled.listen(); results.enabledBase = enabledBase;
  await run('agent-browser', ['--session', browserSession, 'open', enabledBase]);
  const onEnv = { TEST_BASE_URL: enabledBase, CHROME_DEBUG_PORT: debugPort, TEST_EVIDENCE_DIR: join(evidence, 'enabled-server') };
  await checked('Existing workspace forms survive feature re-enable', process.execPath, [join(root, 'scripts/browser-smoke-workspace.mjs')], { env: onEnv });
  await checked('Existing browser-only experience survives feature re-enable', process.execPath, [join(root, 'scripts/browser-smoke-workspace-public.mjs')], { env: onEnv, cwd: enabledRoot });
  await copyFile(join(enabledRoot, 'docs/implementation/prd-v3/evidence/public-browser-results.json'), join(evidence, 'enabled-public-results.json'));
  assert.match(await readFile(join(root, 'src/site-features.js'), 'utf8'), /WORKSPACE_ENABLED = false/);
  results.ok = true;
} catch (error) { results.error = error.message; if (error.output) results.failureOutput = error.output; process.exitCode = 1; }
finally {
  await run('agent-browser', ['--session', browserSession, 'close']).catch(() => {});
  if (enabled) await new Promise(r => enabled.server.close(r));
  if (legacy.exitCode === null) { const closed = new Promise(r => legacy.once('exit', r)); legacy.kill('SIGTERM'); await closed; }
  results.ownTestServersStopped = true;
  await writeFile(join(evidence, 'suite-results.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({ ok: results.ok, passed: results.checks.filter(c => c.status === 'passed').length, ownTestServersStopped: true, ...(results.error ? { error: results.error, output: results.failureOutput } : {}) }, null, 2));
}
