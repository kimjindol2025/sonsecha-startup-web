import { createServer } from 'node:http';
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { contentFields, defaultSiteContent } from './src/content.js';
import { products as baselineProducts } from './src/products.js';

const root = import.meta.dirname;
const distRoot = resolve(root, 'dist');
const dataRoot = resolve(root, process.env.ADMIN_DATA_DIR || 'data');
const productDataPath = resolve(dataRoot, 'products.json');
const contentDataPath = resolve(dataRoot, 'content.json');
const authDataPath = resolve(dataRoot, 'admin-auth.json');
const port = Number.parseInt(process.env.PORT || '40330', 10);
const production = process.env.NODE_ENV === 'production';
const sessionLifetime = 12 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const allowedCategories = new Set(['chemical', 'tool', 'equipment', 'safety']);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function securityHeaders(extra = {}) {
  return {
    'content-security-policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'referrer-policy': 'strict-origin-when-cross-origin',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    ...extra,
  };
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, securityHeaders({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  }));
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('INVALID_JSON');
  }
}

async function writeJsonAtomic(pathname, value) {
  await mkdir(dataRoot, { recursive: true });
  const temporaryPath = `${pathname}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, pathname);
  await chmod(pathname, 0o600);
}

function cloneBaselineProducts() {
  return baselineProducts.map((product) => ({ ...product }));
}

async function loadProducts() {
  try {
    const parsed = JSON.parse(await readFile(productDataPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : cloneBaselineProducts();
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[products] Failed to read saved products:', error);
    return cloneBaselineProducts();
  }
}

function validateContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_CONTENT');
  return Object.fromEntries(contentFields.map((field) => {
    const value = typeof input[field.key] === 'string' ? input[field.key].trim() : defaultSiteContent[field.key];
    if (value.length > field.maxLength) throw new Error('INVALID_CONTENT');
    return [field.key, value];
  }));
}

async function loadContent() {
  try {
    return validateContent(JSON.parse(await readFile(contentDataPath, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[content] Failed to read saved content:', error);
    return { ...defaultSiteContent };
  }
}

function cleanText(value, maximum, required = false) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if (required && !cleaned) throw new Error('REQUIRED_FIELD');
  if (cleaned.length > maximum) throw new Error('FIELD_TOO_LONG');
  return cleaned;
}

function cleanUrl(value) {
  const cleaned = cleanText(value, 1000);
  if (!cleaned) return '';
  try {
    const parsed = new URL(cleaned);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw new Error('INVALID_URL');
  }
}

function validateProduct(input, existingId = '') {
  const category = cleanText(input.category, 30, true);
  if (!allowedCategories.has(category)) throw new Error('INVALID_CATEGORY');
  const rawPrice = input.price;
  const price = rawPrice === null || rawPrice === '' ? null : Number(rawPrice);
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1_000_000_000_000)) {
    throw new Error('INVALID_PRICE');
  }
  const featured = Number(input.featured ?? 0);
  if (!Number.isFinite(featured) || featured < -10000 || featured > 10000) throw new Error('INVALID_FEATURED');
  return {
    id: existingId || `custom-${Date.now()}-${randomBytes(3).toString('hex')}`,
    name: cleanText(input.name, 160, true),
    category,
    summary: cleanText(input.summary, 600),
    price,
    image: cleanUrl(input.image),
    shopUrl: cleanUrl(input.shopUrl),
    badge: cleanText(input.badge, 30),
    inStock: input.inStock !== false,
    active: input.active !== false,
    featured: Math.round(featured),
  };
}

function makePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join('');
  return `SW-${block()}-${block()}-${block()}`;
}

function passwordRecord(password) {
  const salt = randomBytes(24).toString('hex');
  return {
    algorithm: 'scrypt-v1',
    salt,
    hash: scryptSync(password, salt, 64).toString('hex'),
    updatedAt: new Date().toISOString(),
  };
}

async function ensureCredentials() {
  try {
    const parsed = JSON.parse(await readFile(authDataPath, 'utf8'));
    if (parsed.algorithm !== 'scrypt-v1' || !parsed.salt || !parsed.hash) throw new Error('INVALID_AUTH_FILE');
    return parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const initialPassword = makePassword();
    const record = passwordRecord(initialPassword);
    await writeJsonAtomic(authDataPath, record);
    console.log(`[admin] Initial password: ${initialPassword}`);
    console.log('[admin] Change the initial password after the first login.');
    return record;
  }
}

let credentials = await ensureCredentials();

function passwordMatches(password) {
  if (typeof password !== 'string' || password.length > 200) return false;
  const actual = scryptSync(password, credentials.salt, 64);
  const expected = Buffer.from(credentials.hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').map((part) => {
    const separator = part.indexOf('=');
    return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1))];
  }).filter(([key]) => key));
}

function sessionFor(request) {
  const token = parseCookies(request).sonsecha_admin;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function createSessionCookie(token) {
  return `sonsecha_admin=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(sessionLifetime / 1000)}${production ? '; Secure' : ''}`;
}

function clearSessionCookie() {
  return `sonsecha_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${production ? '; Secure' : ''}`;
}

function requestAddress(request) {
  return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function loginBlocked(address) {
  const entry = loginAttempts.get(address);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    loginAttempts.delete(address);
    return false;
  }
  return entry.count >= 5;
}

function recordFailedLogin(address) {
  const current = loginAttempts.get(address);
  if (!current || current.resetAt <= Date.now()) {
    loginAttempts.set(address, { count: 1, resetAt: Date.now() + 10 * 60 * 1000 });
  } else {
    current.count += 1;
  }
}

function isCrossSiteWrite(request) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
    && request.headers['sec-fetch-site'] === 'cross-site';
}

async function handleApi(request, response, url) {
  if (isCrossSiteWrite(request)) return sendError(response, 403, '허용되지 않은 요청입니다.');

  if (request.method === 'GET' && url.pathname === '/api/products') {
    const products = await loadProducts();
    return sendJson(response, 200, { products: products.filter((product) => product.active !== false) });
  }

  if (request.method === 'GET' && url.pathname === '/api/content') {
    return sendJson(response, 200, { content: await loadContent() });
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/login') {
    const address = requestAddress(request);
    if (loginBlocked(address)) return sendError(response, 429, '10분 후에 다시 시도해 주세요.');
    const body = await readJsonBody(request);
    if (!passwordMatches(body.password)) {
      recordFailedLogin(address);
      return sendError(response, 401, '비밀번호가 맞지 않습니다.');
    }
    loginAttempts.delete(address);
    const token = randomBytes(32).toString('base64url');
    sessions.set(token, { expiresAt: Date.now() + sessionLifetime });
    return sendJson(response, 200, { authenticated: true }, { 'set-cookie': createSessionCookie(token) });
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/session') {
    return sendJson(response, 200, { authenticated: Boolean(sessionFor(request)) });
  }

  const session = sessionFor(request);
  if (!session) return sendError(response, 401, '관리자 로그인이 필요합니다.');

  if (request.method === 'POST' && url.pathname === '/api/admin/logout') {
    sessions.delete(session.token);
    return sendJson(response, 200, { authenticated: false }, { 'set-cookie': clearSessionCookie() });
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/products') {
    return sendJson(response, 200, { products: await loadProducts() });
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/content') {
    return sendJson(response, 200, { content: await loadContent(), fields: contentFields });
  }

  if (request.method === 'PUT' && url.pathname === '/api/admin/content') {
    const body = await readJsonBody(request);
    const content = validateContent(body.content);
    await writeJsonAtomic(contentDataPath, content);
    return sendJson(response, 200, { content });
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/products') {
    const products = await loadProducts();
    const product = validateProduct(await readJsonBody(request));
    products.unshift(product);
    await writeJsonAtomic(productDataPath, products);
    return sendJson(response, 201, { product });
  }

  const productMatch = url.pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (request.method === 'PUT' && productMatch) {
    const productId = decodeURIComponent(productMatch[1]);
    const products = await loadProducts();
    const index = products.findIndex((product) => String(product.id) === productId);
    if (index < 0) return sendError(response, 404, '상품을 찾을 수 없습니다.');
    const product = validateProduct(await readJsonBody(request), productId);
    products[index] = product;
    await writeJsonAtomic(productDataPath, products);
    return sendJson(response, 200, { product });
  }

  if (request.method === 'PUT' && url.pathname === '/api/admin/password') {
    const body = await readJsonBody(request);
    const newPassword = typeof body.password === 'string' ? body.password.trim() : '';
    if (newPassword.length < 8 || newPassword.length > 200) {
      return sendError(response, 400, '비밀번호는 8자 이상으로 설정해 주세요.');
    }
    credentials = passwordRecord(newPassword);
    await writeJsonAtomic(authDataPath, credentials);
    sessions.clear();
    return sendJson(response, 200, { changed: true }, { 'set-cookie': clearSessionCookie() });
  }

  return sendError(response, 404, '요청한 API를 찾을 수 없습니다.');
}

async function serveStatic(request, response, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';
  const filePath = resolve(distRoot, `.${pathname}`);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
    response.writeHead(403, securityHeaders({ 'content-type': 'text/plain; charset=utf-8' }));
    return response.end('Forbidden');
  }
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
    const content = await readFile(filePath);
    const isHtml = extname(filePath) === '.html';
    response.writeHead(200, securityHeaders({
      'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'cache-control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
    }));
    if (request.method === 'HEAD') return response.end();
    response.end(content);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[static]', error);
    response.writeHead(404, securityHeaders({ 'content-type': 'text/plain; charset=utf-8' }));
    response.end('Not found');
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
    if (!['GET', 'HEAD'].includes(request.method)) return sendError(response, 405, '허용되지 않은 메서드입니다.');
    return await serveStatic(request, response, url);
  } catch (error) {
    if (error.message === 'BODY_TOO_LARGE') return sendError(response, 413, '요청 크기가 너무 큽니다.');
    if (error.message === 'INVALID_JSON') return sendError(response, 400, 'JSON 형식을 확인해 주세요.');
    if (['REQUIRED_FIELD', 'FIELD_TOO_LONG', 'INVALID_URL', 'INVALID_PRICE', 'INVALID_FEATURED', 'INVALID_CATEGORY', 'INVALID_CONTENT'].includes(error.message)) {
      return sendError(response, 400, '입력값을 확인해 주세요.');
    }
    console.error('[server]', error);
    return sendError(response, 500, '서버 처리 중 오류가 발생했습니다.');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[server] Serving ${distRoot} on 0.0.0.0:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
