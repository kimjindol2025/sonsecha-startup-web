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
const analyticsDataPath = resolve(dataRoot, 'analytics.json');
const port = Number.parseInt(process.env.PORT || '40330', 10);
const production = process.env.NODE_ENV === 'production';
const sessionLifetime = 12 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const analyticsAttempts = new Map();
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

function emptyAnalytics() {
  return {
    version: 1,
    updatedAt: null,
    totalClicks: 0,
    devices: { mobile: 0, tablet: 0, desktop: 0, unknown: 0 },
    events: {},
    days: {},
  };
}

function normalizeAnalytics(value) {
  const fallback = emptyAnalytics();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  return {
    ...fallback,
    ...value,
    totalClicks: Number.isSafeInteger(value.totalClicks) && value.totalClicks >= 0 ? value.totalClicks : 0,
    devices: value.devices && typeof value.devices === 'object' ? { ...fallback.devices, ...value.devices } : fallback.devices,
    events: value.events && typeof value.events === 'object' && !Array.isArray(value.events) ? value.events : {},
    days: value.days && typeof value.days === 'object' && !Array.isArray(value.days) ? value.days : {},
  };
}

let analyticsStatePromise;
let analyticsWriteQueue = Promise.resolve();

async function loadAnalytics() {
  if (!analyticsStatePromise) {
    analyticsStatePromise = readFile(analyticsDataPath, 'utf8')
      .then((source) => normalizeAnalytics(JSON.parse(source)))
      .catch((error) => {
        if (error.code !== 'ENOENT') console.error('[analytics] Failed to read saved analytics:', error);
        return emptyAnalytics();
      });
  }
  return analyticsStatePromise;
}

function kstDay(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function recentKstDays(count) {
  const result = [];
  const now = Date.now();
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    result.push(kstDay(new Date(now - offset * 86_400_000)));
  }
  return result;
}

function analyticsAllowed(address) {
  const now = Date.now();
  const current = analyticsAttempts.get(address);
  if (!current || current.resetAt <= now) {
    if (analyticsAttempts.size > 10_000) analyticsAttempts.clear();
    analyticsAttempts.set(address, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

function cleanAnalyticsEvent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_ANALYTICS');
  const key = cleanText(input.key, 160, true);
  if (!/^[a-z0-9][a-z0-9:._-]*$/i.test(key)) throw new Error('INVALID_ANALYTICS');
  const device = ['mobile', 'tablet', 'desktop'].includes(input.device) ? input.device : 'unknown';
  return {
    key,
    label: cleanText(input.label, 120) || key,
    kind: cleanText(input.kind, 30) || 'control',
    section: cleanText(input.section, 80) || '기타',
    path: cleanText(input.path, 200) || '/',
    href: cleanText(input.href, 500),
    device,
  };
}

async function recordAnalyticsClick(input) {
  const event = cleanAnalyticsEvent(input);
  analyticsWriteQueue = analyticsWriteQueue.catch(() => {}).then(async () => {
    const analytics = await loadAnalytics();
    const now = new Date();
    const timestamp = now.toISOString();
    const dayKey = kstDay(now);
    const existing = analytics.events[event.key];
    if (!existing && Object.keys(analytics.events).length >= 2_000) return;
    analytics.totalClicks += 1;
    analytics.updatedAt = timestamp;
    analytics.devices[event.device] = Number(analytics.devices[event.device] || 0) + 1;
    analytics.events[event.key] = {
      ...event,
      total: Number(existing?.total || 0) + 1,
      firstClickedAt: existing?.firstClickedAt || timestamp,
      lastClickedAt: timestamp,
    };
    const day = analytics.days[dayKey] || { total: 0, events: {} };
    day.total = Number(day.total || 0) + 1;
    day.events[event.key] = Number(day.events[event.key] || 0) + 1;
    analytics.days[dayKey] = day;
    const cutoff = recentKstDays(366)[0];
    Object.keys(analytics.days).forEach((key) => {
      if (key < cutoff) delete analytics.days[key];
    });
    await writeJsonAtomic(analyticsDataPath, analytics);
  });
  await analyticsWriteQueue;
}

async function analyticsSummary(range) {
  const analytics = await loadAnalytics();
  const dayKeys = recentKstDays(range);
  const periodCounts = {};
  const days = dayKeys.map((date) => {
    const day = analytics.days[date] || { total: 0, events: {} };
    Object.entries(day.events || {}).forEach(([key, count]) => {
      periodCounts[key] = Number(periodCounts[key] || 0) + Number(count || 0);
    });
    return { date, total: Number(day.total || 0) };
  });
  const sumDays = (count) => {
    const selectedDays = new Set(recentKstDays(count));
    return Object.entries(analytics.days)
      .filter(([date]) => selectedDays.has(date))
      .reduce((sum, [, day]) => sum + Number(day.total || 0), 0);
  };
  const events = Object.values(analytics.events)
    .map((event) => ({ ...event, period: periodCounts[event.key] || 0 }))
    .filter((event) => event.period > 0)
    .sort((a, b) => b.period - a.period || b.total - a.total);
  return {
    range,
    updatedAt: analytics.updatedAt,
    totals: {
      lifetime: analytics.totalClicks,
      today: Number(analytics.days[kstDay()]?.total || 0),
      last7: sumDays(7),
      last30: sumDays(30),
      period: days.reduce((sum, day) => sum + day.total, 0),
    },
    devices: analytics.devices,
    days,
    events,
  };
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

  if (request.method === 'POST' && url.pathname === '/api/analytics/click') {
    const address = requestAddress(request);
    if (!analyticsAllowed(address)) return sendJson(response, 202, { accepted: false });
    await recordAnalyticsClick(await readJsonBody(request));
    return sendJson(response, 202, { accepted: true });
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

  if (request.method === 'GET' && url.pathname === '/api/admin/analytics') {
    const requestedRange = Number.parseInt(url.searchParams.get('range') || '30', 10);
    const range = [7, 30, 90, 365].includes(requestedRange) ? requestedRange : 30;
    return sendJson(response, 200, { analytics: await analyticsSummary(range) });
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
    if (['REQUIRED_FIELD', 'FIELD_TOO_LONG', 'INVALID_URL', 'INVALID_PRICE', 'INVALID_FEATURED', 'INVALID_CATEGORY', 'INVALID_CONTENT', 'INVALID_ANALYTICS'].includes(error.message)) {
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
