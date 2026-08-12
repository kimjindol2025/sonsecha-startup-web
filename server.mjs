import { createServer } from 'node:http';
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createConsultationStore } from './consultations-store.mjs';
import { contentFields, defaultSiteContent } from './src/content.js';
import { products as baselineProducts } from './src/products.js';
import { createCarwashRecord, deleteCarwashRecord, decorateWashPriceState, loadWashPriceStore, replaceServicePrices, saveWashPriceStore, updateCarwashRecord, upsertPriceRecord } from './src/washprice-store.js';

const root = import.meta.dirname;
const distRoot = resolve(root, 'dist');
const dataRoot = resolve(root, process.env.ADMIN_DATA_DIR || 'data');
const productDataPath = resolve(dataRoot, 'products.json');
const contentDataPath = resolve(dataRoot, 'content.json');
const authDataPath = resolve(dataRoot, 'admin-auth.json');
const analyticsDataPath = resolve(dataRoot, 'analytics.json');
const feedbackDataPath = resolve(dataRoot, 'feedback.sqlite');
const port = Number.parseInt(process.env.PORT || '40330', 10);
const production = process.env.NODE_ENV === 'production';
const sessionLifetime = 12 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const analyticsAttempts = new Map();
const feedbackAttempts = new Map();
const consultationAttempts = new Map();
const allowedWashPriceServiceTypes = new Set(['vacuum', 'foam', 'underbody', 'mat', 'air', 'etc']);
const allowedCategories = new Set(['chemical', 'tool', 'equipment', 'safety']);
const allowedFeedbackKinds = new Set(['helpful', 'problem', 'idea', 'other']);
const allowedFeedbackStatuses = new Set(['new', 'reviewing', 'done']);

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

function sendBinary(response, statusCode, data, mime) {
  response.writeHead(statusCode, securityHeaders({
    'content-type': mime,
    'content-length': data.length,
    'cache-control': 'private, no-store',
    'content-disposition': 'inline',
  }));
  response.end(data);
}

async function readJsonBody(request, maximum = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximum) throw new Error('BODY_TOO_LARGE');
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

await mkdir(dataRoot, { recursive: true });
const consultationStore = await createConsultationStore(dataRoot);
const feedbackDatabase = new DatabaseSync(feedbackDataPath);
feedbackDatabase.exec(`
  PRAGMA journal_mode = DELETE;
  PRAGMA busy_timeout = 3000;
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    area TEXT NOT NULL,
    message TEXT NOT NULL,
    page TEXT NOT NULL,
    device TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS feedback_status_created_idx ON feedback(status, created_at DESC);
`);
await chmod(feedbackDataPath, 0o600);

const insertFeedback = feedbackDatabase.prepare(`
  INSERT INTO feedback (kind, area, message, page, device, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 'new', ?, ?)
`);
const listFeedback = feedbackDatabase.prepare(`
  SELECT id, kind, area, message, page, device, status, created_at AS createdAt, updated_at AS updatedAt
  FROM feedback
  ORDER BY created_at DESC
  LIMIT 500
`);
const feedbackCounts = feedbackDatabase.prepare(`
  SELECT status, COUNT(*) AS count FROM feedback GROUP BY status
`);
const updateFeedbackStatus = feedbackDatabase.prepare(`
  UPDATE feedback SET status = ?, updated_at = ? WHERE id = ?
`);
const getFeedback = feedbackDatabase.prepare(`
  SELECT id, kind, area, message, page, device, status, created_at AS createdAt, updated_at AS updatedAt
  FROM feedback WHERE id = ?
`);

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

function feedbackAllowed(address) {
  const now = Date.now();
  const current = feedbackAttempts.get(address);
  if (!current || current.resetAt <= now) {
    if (feedbackAttempts.size > 10_000) feedbackAttempts.clear();
    feedbackAttempts.set(address, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 5;
}

function consultationAllowed(address) {
  const now = Date.now();
  const current = consultationAttempts.get(address);
  if (!current || current.resetAt <= now) {
    if (consultationAttempts.size > 10_000) consultationAttempts.clear();
    consultationAttempts.set(address, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 8;
}

function validateFeedback(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_FEEDBACK');
  const kind = cleanText(input.kind, 20, true);
  if (!allowedFeedbackKinds.has(kind)) throw new Error('INVALID_FEEDBACK');
  const message = cleanText(input.message, 1000, true);
  if (message.length < 5) throw new Error('INVALID_FEEDBACK');
  return {
    kind,
    area: cleanText(input.area, 80) || '기타',
    message,
    page: cleanText(input.page, 200) || '/',
    device: ['mobile', 'tablet', 'desktop'].includes(input.device) ? input.device : 'unknown',
    website: cleanText(input.website, 200),
  };
}

function feedbackSummary() {
  const counts = { new: 0, reviewing: 0, done: 0, total: 0 };
  feedbackCounts.all().forEach((row) => {
    if (row.status in counts) counts[row.status] = Number(row.count || 0);
    counts.total += Number(row.count || 0);
  });
  return { feedback: listFeedback.all(), counts };
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
  if (/^\/(?!\/)[A-Za-z0-9/_\-.%]+$/.test(cleaned)) return cleaned;
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
    details: cleanText(input.details, 4000),
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
  const actual = scryptSync(password.trim(), credentials.salt, 64);
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

function validateWashPriceCarwash(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_WASHPRICE');
  const numeric = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    name: cleanText(input.name, 120, true),
    address: cleanText(input.address, 200, true),
    sido: cleanText(input.sido, 40, true),
    sigungu: cleanText(input.sigungu, 60, true),
    dong: cleanText(input.dong, 60, true),
    latitude: numeric(input.latitude),
    longitude: numeric(input.longitude),
    phone: cleanText(input.phone, 40, true),
    open_24h: Boolean(input.open_24h),
    card_available: Boolean(input.card_available),
  };
}

function validateWashPriceRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_WASHPRICE');
  const integer = (value, field, minimum = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < minimum) throw new Error('INVALID_' + field);
    return Math.trunc(parsed);
  };
  return {
    base_price: integer(input.base_price, 'WASHPRICE'),
    base_seconds: integer(input.base_seconds, 'WASHPRICE', 1),
    extra_price: integer(input.extra_price, 'WASHPRICE'),
    extra_seconds: integer(input.extra_seconds, 'WASHPRICE', 1),
    verified_at: cleanText(input.verified_at, 20, true),
    source: cleanText(input.source, 120, true),
  };
}

function validateWashPriceServices(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_WASHPRICE');
  const services = Array.isArray(input.services) ? input.services : [];
  return services
    .map((service) => {
      if (!service || typeof service !== 'object' || Array.isArray(service)) return null;
      const serviceType = cleanText(service.service_type, 20, true);
      if (!allowedWashPriceServiceTypes.has(serviceType)) throw new Error('INVALID_WASHPRICE');
      const price = Number(service.price);
      const seconds = Number(service.seconds);
      const memo = cleanText(service.memo, 80);
      if (!Number.isFinite(price) && !Number.isFinite(seconds) && !memo) return null;
      return {
        service_type: serviceType,
        price: Number.isFinite(price) ? Math.trunc(price) : 0,
        seconds: Number.isFinite(seconds) ? Math.trunc(seconds) : 0,
        memo,
      };
    })
    .filter(Boolean);
}

async function handleApi(request, response, url) {
  if (isCrossSiteWrite(request)) return sendError(response, 403, '허용되지 않은 요청입니다.');

  if (request.method === 'GET' && url.pathname === '/api/washprice/state') {
    const store = await loadWashPriceStore(dataRoot);
    return sendJson(response, 200, { state: decorateWashPriceState(store) });
  }

  if (request.method === 'POST' && url.pathname === '/api/washprice/carwashes') {
    const store = await loadWashPriceStore(dataRoot);
    const carwash = createCarwashRecord(store, validateWashPriceCarwash(await readJsonBody(request)));
    await saveWashPriceStore(dataRoot, store);
    return sendJson(response, 201, { carwash, state: decorateWashPriceState(store) });
  }

  const washPriceCarwashMatch = url.pathname.match(/^\/api\/washprice\/carwashes\/(\d+)$/);
  if (request.method === 'PUT' && washPriceCarwashMatch) {
    const store = await loadWashPriceStore(dataRoot);
    const carwash = updateCarwashRecord(store, washPriceCarwashMatch[1], validateWashPriceCarwash(await readJsonBody(request)));
    if (!carwash) return sendError(response, 404, '세차장을 찾을 수 없습니다.');
    await saveWashPriceStore(dataRoot, store);
    return sendJson(response, 200, { carwash, state: decorateWashPriceState(store) });
  }
  if (request.method === 'DELETE' && washPriceCarwashMatch) {
    const store = await loadWashPriceStore(dataRoot);
    if (!deleteCarwashRecord(store, washPriceCarwashMatch[1])) return sendError(response, 404, '세차장을 찾을 수 없습니다.');
    await saveWashPriceStore(dataRoot, store);
    return sendJson(response, 200, { deleted: true, state: decorateWashPriceState(store) });
  }

  const washPriceServiceMatch = url.pathname.match(/^\/api\/washprice\/carwashes\/(\d+)\/services$/);
  if (request.method === 'PUT' && washPriceServiceMatch) {
    const store = await loadWashPriceStore(dataRoot);
    const services = validateWashPriceServices(await readJsonBody(request));
    const servicePrices = replaceServicePrices(store, washPriceServiceMatch[1], services);
    if (!servicePrices) return sendError(response, 404, '세차장을 찾을 수 없습니다.');
    await saveWashPriceStore(dataRoot, store);
    return sendJson(response, 200, { servicePrices, state: decorateWashPriceState(store) });
  }

  const washPriceRecordMatch = url.pathname.match(/^\/api\/washprice\/carwashes\/(\d+)\/prices$/);
  if (request.method === 'POST' && washPriceRecordMatch) {
    const store = await loadWashPriceStore(dataRoot);
    const price = upsertPriceRecord(store, washPriceRecordMatch[1], validateWashPriceRecord(await readJsonBody(request)));
    if (!price) return sendError(response, 404, '세차장을 찾을 수 없습니다.');
    await saveWashPriceStore(dataRoot, store);
    return sendJson(response, 201, { price, state: decorateWashPriceState(store) });
  }

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

  if (request.method === 'POST' && url.pathname === '/api/feedback') {
    const feedback = validateFeedback(await readJsonBody(request));
    if (feedback.website) return sendJson(response, 201, { received: true });
    const address = requestAddress(request);
    if (!feedbackAllowed(address)) return sendError(response, 429, '의견은 한 시간에 5개까지 보낼 수 있습니다. 잠시 후 다시 시도해 주세요.');
    const timestamp = new Date().toISOString();
    const result = insertFeedback.run(
      feedback.kind, feedback.area, feedback.message, feedback.page, feedback.device, timestamp, timestamp,
    );
    return sendJson(response, 201, { received: true, id: Number(result.lastInsertRowid) });
  }

  if (request.method === 'POST' && url.pathname === '/api/consultations') {
    const address = requestAddress(request);
    if (!consultationAllowed(address)) return sendError(response, 429, '상담 요청은 한 시간에 8건까지 만들 수 있습니다. 잠시 후 다시 시도해 주세요.');
    const result = await consultationStore.create(await readJsonBody(request));
    return sendJson(response, 201, { ...result, emailDelivery: 'queued' });
  }

  const publicConsultationMatch = url.pathname.match(/^\/api\/consultations\/([A-Z0-9-]+)$/);
  if (request.method === 'GET' && publicConsultationMatch) {
    const consultation = consultationStore.getPublic(publicConsultationMatch[1], request.headers['x-consultation-key']);
    if (!consultation) return sendError(response, 404, '상담 건을 찾을 수 없거나 접근키가 맞지 않습니다.');
    return sendJson(response, 200, { consultation });
  }

  const publicMessageMatch = url.pathname.match(/^\/api\/consultations\/([A-Z0-9-]+)\/messages$/);
  if (request.method === 'POST' && publicMessageMatch) {
    const consultation = consultationStore.addMessage(
      publicMessageMatch[1], request.headers['x-consultation-key'], 'user', await readJsonBody(request),
    );
    if (!consultation) return sendError(response, 404, '상담 건을 찾을 수 없거나 접근키가 맞지 않습니다.');
    consultationStore.setEmailResult(publicMessageMatch[1], 'queued', '새 사용자 메시지 이메일 발송 대기');
    return sendJson(response, 201, { consultation, emailDelivery: 'queued' });
  }

  const publicSeenMatch = url.pathname.match(/^\/api\/consultations\/([A-Z0-9-]+)\/seen$/);
  if (request.method === 'POST' && publicSeenMatch) {
    const consultation = consultationStore.markSeen(publicSeenMatch[1], request.headers['x-consultation-key']);
    if (!consultation) return sendError(response, 404, '상담 건을 찾을 수 없거나 접근키가 맞지 않습니다.');
    return sendJson(response, 200, { consultation });
  }

  const publicPhotoCollectionMatch = url.pathname.match(/^\/api\/consultations\/([A-Z0-9-]+)\/photos$/);
  if (request.method === 'POST' && publicPhotoCollectionMatch) {
    const consultation = await consultationStore.addAttachment(
      publicPhotoCollectionMatch[1], request.headers['x-consultation-key'], await readJsonBody(request, 5_000_000),
    );
    if (!consultation) return sendError(response, 404, '상담 건을 찾을 수 없거나 접근키가 맞지 않습니다.');
    return sendJson(response, 201, { consultation });
  }

  const publicPhotoMatch = url.pathname.match(/^\/api\/consultations\/([A-Z0-9-]+)\/photos\/(\d+)$/);
  if (publicPhotoMatch && request.method === 'GET') {
    const photo = await consultationStore.attachment(
      publicPhotoMatch[1], Number(publicPhotoMatch[2]), request.headers['x-consultation-key'], false,
    );
    if (!photo) return sendError(response, 404, '사진을 찾을 수 없습니다.');
    return sendBinary(response, 200, photo.data, photo.attachment.mime);
  }
  if (publicPhotoMatch && request.method === 'DELETE') {
    const removed = await consultationStore.deleteAttachment(
      publicPhotoMatch[1], Number(publicPhotoMatch[2]), request.headers['x-consultation-key'], false,
    );
    if (!removed) return sendError(response, 404, '사진을 찾을 수 없습니다.');
    return sendJson(response, 200, { removed: true });
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

  if (request.method === 'GET' && url.pathname === '/api/admin/feedback') {
    return sendJson(response, 200, feedbackSummary());
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/consultations') {
    return sendJson(response, 200, { consultations: consultationStore.list() });
  }

  const adminConsultationMatch = url.pathname.match(/^\/api\/admin\/consultations\/([A-Z0-9-]+)$/);
  if (request.method === 'GET' && adminConsultationMatch) {
    const consultation = consultationStore.getAdmin(adminConsultationMatch[1]);
    if (!consultation) return sendError(response, 404, '상담 건을 찾을 수 없습니다.');
    return sendJson(response, 200, { consultation });
  }
  if (request.method === 'PATCH' && adminConsultationMatch) {
    const body = await readJsonBody(request);
    const consultation = consultationStore.updateStatus(adminConsultationMatch[1], cleanText(body.status, 30, true));
    if (!consultation) return sendError(response, 404, '상담 건을 찾을 수 없습니다.');
    return sendJson(response, 200, { consultation });
  }

  const adminMessageMatch = url.pathname.match(/^\/api\/admin\/consultations\/([A-Z0-9-]+)\/messages$/);
  if (request.method === 'POST' && adminMessageMatch) {
    const consultation = consultationStore.addMessage(adminMessageMatch[1], '', 'admin', await readJsonBody(request));
    if (!consultation) return sendError(response, 404, '상담 건을 찾을 수 없습니다.');
    return sendJson(response, 201, { consultation });
  }

  const adminPhotoMatch = url.pathname.match(/^\/api\/admin\/consultations\/([A-Z0-9-]+)\/photos\/(\d+)$/);
  if (adminPhotoMatch && request.method === 'GET') {
    const photo = await consultationStore.attachment(adminPhotoMatch[1], Number(adminPhotoMatch[2]), '', true);
    if (!photo) return sendError(response, 404, '사진을 찾을 수 없습니다.');
    return sendBinary(response, 200, photo.data, photo.attachment.mime);
  }
  if (adminPhotoMatch && request.method === 'DELETE') {
    const removed = await consultationStore.deleteAttachment(adminPhotoMatch[1], Number(adminPhotoMatch[2]), '', true);
    if (!removed) return sendError(response, 404, '사진을 찾을 수 없습니다.');
    return sendJson(response, 200, { removed: true });
  }

  const feedbackMatch = url.pathname.match(/^\/api\/admin\/feedback\/(\d+)$/);
  if (request.method === 'PATCH' && feedbackMatch) {
    const feedbackId = Number.parseInt(feedbackMatch[1], 10);
    const body = await readJsonBody(request);
    const status = cleanText(body.status, 20, true);
    if (!allowedFeedbackStatuses.has(status)) throw new Error('INVALID_FEEDBACK');
    const result = updateFeedbackStatus.run(status, new Date().toISOString(), feedbackId);
    if (!result.changes) return sendError(response, 404, '피드백을 찾을 수 없습니다.');
    return sendJson(response, 200, { feedback: getFeedback.get(feedbackId) });
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
  if (pathname === '/washprice') pathname = '/washprice.html';
  if (pathname === '/washprice-admin') pathname = '/washprice-admin.html';
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
    if (error.message === 'CONSENT_REQUIRED') return sendError(response, 400, '공유 동의 후 전송할 수 있습니다.');
    if (error.message === 'PHOTO_LIMIT') return sendError(response, 400, '사진은 상담 건당 10장까지 보낼 수 있습니다.');
    if (error.message === 'PHOTO_SHARING_DISABLED') return sendError(response, 400, '사진 공유를 선택하지 않은 상담 건입니다.');
    if (['REQUIRED_FIELD', 'FIELD_TOO_LONG', 'INVALID_URL', 'INVALID_PRICE', 'INVALID_FEATURED', 'INVALID_CATEGORY', 'INVALID_CONTENT', 'INVALID_ANALYTICS', 'INVALID_FEEDBACK', 'INVALID_CONSULTATION', 'INVALID_PHOTO'].includes(error.message)) {
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
  server.close(() => {
    feedbackDatabase.close();
    consultationStore.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
