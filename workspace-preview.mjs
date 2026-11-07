import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname, sep, isAbsolute } from 'node:path';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createWorkspaceStore, WorkspaceError, statusLabels } from './workspace-store.mjs';
import { products } from './src/products.js';
import { defaultSiteContent } from './src/content.js';

export const demoPrincipals = [
  { id: 'customer-a', label: '고객 가', role: 'customer', teamId: 'demo-team' },
  { id: 'customer-b', label: '고객 나', role: 'customer', teamId: 'demo-team' },
  { id: 'manager', label: '관리 책임자', role: 'manager', teamId: 'demo-team' },
  { id: 'staff-a', label: '담당자 가', role: 'staff', teamId: 'demo-team' },
  { id: 'staff-b', label: '담당자 나', role: 'staff', teamId: 'demo-team' },
];
const headers = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
async function jsonBody(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 3_000_000) throw new WorkspaceError(413, 'BODY_LIMIT', '요청 크기를 줄여 주세요.');
    chunks.push(chunk);
  }
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString());
    if (!input || Array.isArray(input) || typeof input !== 'object') throw Error();
    return input;
  } catch { throw new WorkspaceError(400, 'INVALID_JSON', '입력 내용을 확인해 주세요.'); }
}

// Deliberately separate from server.mjs: no demo identity endpoints in the production server.
export function createWorkspacePreview({ dataDir, distDir = resolve(import.meta.dirname, 'dist'), demo = false, environment = process.env.NODE_ENV } = {}) {
  if (!demo || environment === 'production' || process.env.NODE_ENV === 'production') throw new Error('Workspace demo requires explicit opt-in and cannot run in production');
  if (!dataDir || !isAbsolute(dataDir)) throw new Error('An absolute, isolated workspace demo data directory is required');
  const productionData = resolve(import.meta.dirname, 'data');
  if (resolve(dataDir) === productionData) throw new Error('Do not use the existing application data directory');
  if (['consultations.sqlite', 'feedback.sqlite', 'admin-auth.json', 'products.json', 'content.json'].some(name => existsSync(resolve(dataDir, name)))) throw new Error('Workspace demo cannot use a legacy application data directory');
  const store = createWorkspaceStore(resolve(dataDir, 'workspace.sqlite'));
  for (const principal of demoPrincipals) store.registerPrincipal(principal);
  const sessions = new Map();
  function send(res, status, payload, extra = {}) {
    res.writeHead(status, { ...headers, 'content-type': 'application/json; charset=utf-8', ...extra });
    res.end(JSON.stringify(payload));
  }
  function actor(req) {
    const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('workspace_demo='))?.slice(15);
    const session = sessions.get(cookie);
    if (!session || session.expires < Date.now()) { if (cookie) sessions.delete(cookie); throw new WorkspaceError(401, 'IDENTITY_REQUIRED', '시험 역할을 선택해 주세요.'); }
    return session.actorId;
  }
  const server = createServer(async (req, res) => {
    try {
      const host = req.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new WorkspaceError(403, 'INVALID_HOST', '로컬 시험 환경에서만 사용할 수 있습니다.');
      const url = new URL(req.url, `http://${host}`);
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== url.origin)) throw new WorkspaceError(403, 'CROSS_SITE', '다른 사이트에서 보낸 요청은 처리하지 않습니다.');
        if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new WorkspaceError(415, 'JSON_REQUIRED', 'JSON 요청만 처리합니다.');
      }
      if (url.pathname === '/api/workspace/demo' && req.method === 'GET') {
        let current = null;
        try { current = store.principal(actor(req)); } catch (e) { if (e.status !== 401) throw e; }
        return send(res, 200, { demo: true, principals: demoPrincipals.map(({ teamId, ...p }) => p), actor: current, statusLabels });
      }
      if (url.pathname === '/api/workspace/demo/actor' && req.method === 'POST') {
        const input = await jsonBody(req);
        if (!demoPrincipals.some(p => p.id === input.actorId)) throw new WorkspaceError(400, 'UNKNOWN_ACTOR', '시험 역할을 확인해 주세요.');
        const previous = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('workspace_demo='))?.slice(15);
        if (previous) sessions.delete(previous);
        // Bound demo sessions as well as giving them an expiry.
        for (const [key, value] of sessions) if (value.expires < Date.now()) sessions.delete(key);
        if (sessions.size >= 1000) throw new WorkspaceError(429, 'SESSION_LIMIT', '시험 세션 수를 줄여 주세요.');
        const token = randomBytes(32).toString('base64url');
        sessions.set(token, { actorId: input.actorId, expires: Date.now() + 8 * 60 * 60 * 1000 });
        return send(res, 200, { actor: store.principal(input.actorId) }, { 'set-cookie': `workspace_demo=${token}; HttpOnly; SameSite=Strict; Path=/api/workspace; Max-Age=28800` });
      }
      if (url.pathname.startsWith('/api/workspace/')) {
        const who = actor(req);
        if (url.pathname === '/api/workspace/staff' && req.method === 'GET') return send(res, 200, { staff: store.staffList(who) });
        if (url.pathname === '/api/workspace/projects') {
          if (req.method === 'GET') return send(res, 200, { projects: store.listProjects(who) });
          if (req.method === 'POST') return send(res, 200, { project: store.createProject(who, await jsonBody(req)) });
        }
        let match;
        if ((match = url.pathname.match(/^\/api\/workspace\/projects\/([\w-]+)$/)) && req.method === 'GET') return send(res, 200, { project: store.project(who, match[1]) });
        if ((match = url.pathname.match(/^\/api\/workspace\/projects\/([\w-]+)\/candidates(?:\/([\w-]+))?$/)) && ['POST', 'PATCH'].includes(req.method)) return send(res, 200, store.saveCandidate(who, match[1], match[2] || null, await jsonBody(req)));
        if ((match = url.pathname.match(/^\/api\/workspace\/projects\/([\w-]+)\/assignment$/)) && req.method === 'POST') return send(res, 200, { project: store.assign(who, match[1], await jsonBody(req)) });
        if ((match = url.pathname.match(/^\/api\/workspace\/projects\/([\w-]+)\/inquiries$/)) && req.method === 'POST') return send(res, 200, { inquiry: store.submit(who, match[1], await jsonBody(req)) });
        if ((match = url.pathname.match(/^\/api\/workspace\/inquiries\/([\w-]+)$/)) && req.method === 'GET') return send(res, 200, { inquiry: store.inquiry(who, match[1]) });
        if ((match = url.pathname.match(/^\/api\/workspace\/inquiries\/([\w-]+)\/(transition|reply|followup|additional|note|review)$/)) && req.method === 'POST') return send(res, 200, { inquiry: store.act(who, match[1], match[2], await jsonBody(req)) });
        if ((match = url.pathname.match(/^\/api\/workspace\/inquiries\/([\w-]+)\/attachments$/)) && req.method === 'POST') return send(res, 200, { inquiry: store.attach(who, match[1], await jsonBody(req)) });
        if ((match = url.pathname.match(/^\/api\/workspace\/attachments\/([\w-]+)$/)) && req.method === 'GET') {
          const file = store.attachment(who, match[1]);
          res.writeHead(200, { ...headers, 'content-type': file.mime, 'content-disposition': `attachment; filename="photo${file.mime === 'image/jpeg' ? '.jpg' : file.mime === 'image/png' ? '.png' : '.webp'}"`, 'content-length': file.data.length });
          return res.end(file.data);
        }
        throw new WorkspaceError(404, 'NOT_FOUND', '자료를 찾을 수 없습니다.');
      }
      if (req.method === 'GET' && url.pathname === '/api/products') return send(res, 200, { products });
      if (req.method === 'GET' && url.pathname === '/api/content') return send(res, 200, { content: defaultSiteContent });
      if (url.pathname.startsWith('/api/')) throw new WorkspaceError(404, 'NOT_FOUND', '이 시험 환경에서는 기존 접수를 보내지 않습니다.');
      if (!['GET', 'HEAD'].includes(req.method)) throw new WorkspaceError(405, 'METHOD_NOT_ALLOWED', '허용되지 않는 요청입니다.');
      const route = url.pathname === '/' ? '/workspace.html' : decodeURIComponent(url.pathname);
      if (!['/workspace.html', '/index.html', '/favicon.svg', '/favicon.ico'].includes(route) && !route.startsWith('/assets/') && !route.startsWith('/product-images/')) throw new WorkspaceError(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.');
      const file = resolve(distDir, `.${route}`);
      const root = await realpath(distDir);
      let real;
      try { real = await realpath(file); } catch { throw new WorkspaceError(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.'); }
      if (!real.startsWith(root + sep)) throw new WorkspaceError(404, 'NOT_FOUND', '파일을 찾을 수 없습니다.');
      const content = await readFile(real);
      res.writeHead(200, { ...headers, 'content-type': types[extname(real)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (error) {
      const known = error instanceof WorkspaceError;
      send(res, known ? error.status : 500, { error: known ? error.message : '저장하지 못했습니다. 입력은 유지되니 다시 시도해 주세요.', code: known ? error.code : 'INTERNAL_ERROR' });
    }
  });
  server.once('close', () => { sessions.clear(); store.close(); });
  return { server, store, listen(port = 0) { return new Promise((resolveListen, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolveListen(`http://127.0.0.1:${server.address().port}`); }); }); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = createWorkspacePreview({ demo: process.env.WORKSPACE_DEMO === '1', dataDir: resolve(process.env.WORKSPACE_DATA_DIR || '/tmp/sonsecha-workspace-demo') });
  const port = Number(process.env.WORKSPACE_PORT || 40435);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error('Invalid workspace preview port');
  const base = await app.listen(port);
  console.log(`Workspace preview: ${base}/workspace.html (local synthetic data; login deferred)`);
  process.once('SIGTERM', () => app.server.close());
  process.once('SIGINT', () => app.server.close());
}
