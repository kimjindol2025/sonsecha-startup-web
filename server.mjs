import { createServer } from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { chmod, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { isIP } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { createConsultationStore } from './consultations-store.mjs';
import { EmailConfigurationError, EmailDeliveryError, sendCustomerEmail } from './email.mjs';
import { contentFields, defaultSiteContent } from './src/content.js';
import { productCategories, products as baselineProducts } from './src/products.js';
import { localProductImage } from './src/product-images.js';

const root = import.meta.dirname;
const distRoot = resolve(root, 'dist');
const dataRoot = resolve(root, process.env.ADMIN_DATA_DIR || 'data');
const productImageRoot = resolve(dataRoot, 'product-images');
const productDataPath = resolve(dataRoot, 'products.json');
const contentDataPath = resolve(dataRoot, 'content.json');
const authDataPath = resolve(dataRoot, 'admin-auth.json');
const analyticsDataPath = resolve(dataRoot, 'analytics.json');
const feedbackDataPath = resolve(dataRoot, 'feedback.sqlite');
const port = Number.parseInt(process.env.PORT || '40330', 10);
const production = process.env.NODE_ENV === 'production';
const aiProductApiKey = (process.env.AI_PRODUCT_API_KEY || '').trim();
const trustedProxyAddresses = new Set((process.env.TRUSTED_PROXY_IPS || '')
  .split(',')
  .map(normalizeIpAddress)
  .filter(Boolean));
const sessionLifetime = 12 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const analyticsAttempts = new Map();
const feedbackAttempts = new Map();
const consultationAttempts = new Map();
const allowedCategories = new Set(productCategories
  .filter((category) => category.id !== 'all')
  .map((category) => category.id));
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
    'permissions-policy': 'camera=(), geolocation=(), microphone=()',
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

const uploadImageTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

async function saveProductImage(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('INVALID_IMAGE');
  const extension = uploadImageTypes.get(input.type);
  if (!extension || typeof input.data !== 'string') throw new Error('INVALID_IMAGE');
  const match = input.data.match(/^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match || match[1] !== input.type) throw new Error('INVALID_IMAGE');
  const image = Buffer.from(match[2], 'base64');
  if (!image.length || image.length > 5 * 1024 * 1024) throw new Error('INVALID_IMAGE');
  await mkdir(productImageRoot, { recursive: true });
  const filename = `product-${Date.now()}-${randomBytes(5).toString('hex')}.${extension}`;
  await writeFile(resolve(productImageRoot, filename), image, { mode: 0o644 });
  return `/product-images/${filename}`;
}

async function writeJsonAtomic(pathname, value) {
  await mkdir(dataRoot, { recursive: true });
  const temporaryPath = `${pathname}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, pathname);
  await chmod(pathname, 0o600);
}

let catalogWriteQueue = Promise.resolve();
function withCatalogWriteLock(task) {
  const next = catalogWriteQueue.catch(() => {}).then(task);
  catalogWriteQueue = next.catch(() => {});
  return next;
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

function normalizeCatalogProducts(products) {
  return products.map((product) => ({
    ...product,
    image: localProductImage(product.image),
    badge: typeof product.badge === 'string' ? product.badge : '롤오버',
    inStock: product.inStock === true,
    active: product.active !== false,
  }));
}

async function loadProducts() {
  try {
    const parsed = JSON.parse(await readFile(productDataPath, 'utf8'));
    return Array.isArray(parsed) ? normalizeCatalogProducts(parsed) : normalizeCatalogProducts(cloneBaselineProducts());
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[products] Failed to read saved products:', error);
    return normalizeCatalogProducts(cloneBaselineProducts());
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

function validateContact(input, { required = false } = {}) {
  const contact = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const name = cleanText(contact.name, 120);
  const phone = cleanText(contact.phone, 80);
  const email = cleanText(contact.email, 240);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('INVALID_CONTACT');
  if (required && (!name || !phone || !email)) throw new Error('CONTACT_REQUIRED');
  return {
    name,
    phone,
    email,
  };
}

const feedbackKindLabels = {
  helpful: '도움됐어요', problem: '불편해요', idea: '기능 제안', other: '기타 의견',
};
const serviceNeedEmailLabels = {
  equipment: '장비 상담·구매', design: '세차장 설계', permit: '용도변경·인허가',
  construction: '폐수·배수·공사', consulting: '창업 컨설팅', operations: '개업 후 운영관리',
};

function contactLines(contact) {
  return [
    `이름: ${contact.name || '(미입력)'}`,
    `연락처: ${contact.phone || '(미입력)'}`,
    `이메일: ${contact.email || '(미입력)'}`,
  ];
}

function formatFeedbackEmail(feedback, contact) {
  return [
    '손세차장 창업 가이드 고객 의견',
    '',
    `문의 유형: ${feedbackKindLabels[feedback.kind] || feedback.kind}`,
    `관련 화면: ${feedback.area}`,
    ...contactLines(contact),
    `페이지: ${feedback.page}`,
    `기기: ${feedback.device}`,
    '',
    '메시지:',
    feedback.message,
  ].join('\n');
}

function formatCandidateEmail(snapshot, question, contact, receipt) {
  const candidates = snapshot?.version === 2 ? snapshot.candidates || [] : [snapshot || {}];
  const lines = [
    '손세차장 창업 가이드 후보지 검토 요청',
    '',
    `접수번호: ${receipt}`,
    `요청 범위: ${snapshot?.requestScope === 'full' ? '사업계획부터 창업까지 전체 컨설팅' : '현재까지 진행한 부분 검토 후 나머지 안내'}`,
    `필요 지원: ${(snapshot?.serviceNeeds || []).map((item) => serviceNeedEmailLabels[item] || item).join(', ') || '관리자 검토 후 안내'}`,
    ...contactLines(contact),
    '',
    '검토 요청 내용:',
    question,
  ];
  candidates.forEach((candidate, index) => {
    lines.push('', `후보지 ${index + 1}: ${candidate.candidateName || '(이름 미입력)'}`);
    lines.push(`주소: ${candidate.sharing?.address ? candidate.address || '(주소 미입력)' : '(주소 공유 안 함)'}`);
    if (candidate.sharing?.plan && candidate.plan) lines.push(`형태·베이: ${candidate.plan.washType || '(미입력)'} · ${candidate.plan.bayCount || '(베이 수 미입력)'}`);
    lines.push(`진행: ${candidate.progress?.completed || 0}/${candidate.progress?.total || 0}, 미확인 ${candidate.progress?.unchecked || 0}개`);
    if (candidate.sharing?.notes) {
      lines.push('단계별 검토 메모:');
      (candidate.notes || []).forEach((note) => lines.push(`- ${note.label}: ${note.text}`));
    } else lines.push('단계별 검토 메모: 공유 안 함');
  });
  return lines.join('\n');
}

function formatConsultationMessageEmail(receipt, message) {
  return [
    '손세차장 창업 가이드 후보지 검토 상담 추가 메시지',
    '',
    `접수번호: ${receipt}`,
    `작성일: ${message.createdAt || new Date().toISOString()}`,
    `상황: ${message.contextLabel || '전체 상담'}`,
    '',
    '사용자 메시지:',
    message.body,
  ].join('\n');
}

function emailFailure(response, error, extra = {}) {
  if (error instanceof EmailConfigurationError || error?.code === 'SMTP_NOT_CONFIGURED') {
    return sendJson(response, 503, {
      ...extra,
      code: 'SMTP_NOT_CONFIGURED',
      error: '이메일 전송 설정이 필요합니다. 관리자에게 SMTP 환경변수 설정을 요청해 주세요.',
    });
  }
  if (error instanceof EmailDeliveryError || error?.code === 'SMTP_SEND_FAILED') {
    return sendJson(response, 502, { ...extra, code: 'SMTP_SEND_FAILED', error: '이메일을 전송하지 못했습니다. 잠시 후 다시 시도해 주세요.' });
  }
  throw error;
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

function hasValidAiProductApiKey(request) {
  if (!aiProductApiKey) return false;
  const header = request.headers['x-ai-product-api-key'];
  const authorization = request.headers.authorization || '';
  const supplied = (typeof header === 'string' && header.trim())
    || (authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '');
  if (!supplied || supplied.length !== aiProductApiKey.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(aiProductApiKey));
}

function isAiProductRequestAuthorized(request) {
  return Boolean(sessionFor(request) || hasValidAiProductApiKey(request));
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
  const hasBadge = typeof input.badge === 'string';
  const badge = hasBadge ? cleanText(input.badge, 30) : '';
  const hasExplicitStockStatus = input.stockStatus === 'inStock' || input.stockStatus === 'outOfStock';
  const explicitOutOfStock = input.stockStatus === 'outOfStock';
  // Rollover is a promotional badge, but its legacy behavior is to make a
  // product sellable unless the administrator explicitly selected 품절.
  const inStock = hasExplicitStockStatus
    ? !explicitOutOfStock
    : badge === '롤오버'
      ? true
      : input.inStock === true;
  return {
    id: existingId || `custom-${Date.now()}-${randomBytes(3).toString('hex')}`,
    name: cleanText(input.name, 160, true),
    category,
    summary: cleanText(input.summary, 600),
    details: cleanText(input.details, 4000),
    price,
    image: cleanUrl(input.image),
    shopUrl: cleanUrl(input.shopUrl),
    badge: hasBadge ? badge : '롤오버',
    inStock,
    active: input.active !== false,
    featured: Math.round(featured),
  };
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
    const passwordFile = (process.env.ADMIN_INITIAL_PASSWORD_FILE || '').trim();
    const initialPassword = passwordFile
      ? (await readFile(resolve(root, passwordFile), 'utf8')).trim()
      : (process.env.ADMIN_INITIAL_PASSWORD || '').trim();
    if (initialPassword.length < 12 || initialPassword.length > 200) {
      throw new Error('ADMIN_INITIAL_PASSWORD_REQUIRED');
    }
    const record = passwordRecord(initialPassword);
    await writeJsonAtomic(authDataPath, record);
    console.log('[admin] Initial credentials stored. Change the password after the first login.');
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

function normalizeIpAddress(value) {
  const address = String(value || '').trim().replace(/^::ffff:/i, '');
  return isIP(address) ? address : '';
}

function requestAddress(request) {
  const remoteAddress = normalizeIpAddress(request.socket.remoteAddress) || 'unknown';
  if (!trustedProxyAddresses.has(remoteAddress)) return remoteAddress;

  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string') return remoteAddress;
  const chain = forwarded.split(',').map(normalizeIpAddress);
  if (!chain.length || chain.some((address) => !address)) return remoteAddress;

  let address = remoteAddress;
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    if (!trustedProxyAddresses.has(address)) return address;
    address = chain[index];
  }
  return address || remoteAddress;
}

function sameOriginRequest(request) {
  const origin = request.headers.origin;
  if (typeof origin !== 'string' || !origin.trim()) return true;
  if (origin === 'null') return false;
  try {
    const forwardedProto = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
    const protocol = forwardedProto === 'https' || forwardedProto === 'http'
      ? forwardedProto
      : production ? 'https' : 'http';
    return new URL(origin).origin === `${protocol}://${request.headers.host}`;
  } catch {
    return false;
  }
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

  if (request.method === 'POST' && url.pathname === '/api/ai/products') {
    if (!isAiProductRequestAuthorized(request)) return sendError(response, 401, 'AI 상품 등록 인증이 필요합니다.');
    return withCatalogWriteLock(async () => {
      const products = await loadProducts();
      const product = validateProduct(await readJsonBody(request));
      products.unshift(product);
      await writeJsonAtomic(productDataPath, products);
      return sendJson(response, 201, { product });
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/feedback') {
    const body = await readJsonBody(request);
    const feedback = validateFeedback(body);
    const contact = validateContact(body.contact, { required: true });
    if (body.privacyConsent !== true) return sendError(response, 400, '개인정보 수집·이용 동의 후 의견을 보낼 수 있습니다.');
    if (feedback.website) return sendJson(response, 201, { received: true });
    const address = requestAddress(request);
    if (!feedbackAllowed(address)) return sendError(response, 429, '의견은 한 시간에 5개까지 보낼 수 있습니다. 잠시 후 다시 시도해 주세요.');
    const timestamp = new Date().toISOString();
    const result = insertFeedback.run(
      feedback.kind, feedback.area, feedback.message, feedback.page, feedback.device, timestamp, timestamp,
    );
    const id = Number(result.lastInsertRowid);
    try {
      await sendCustomerEmail({
        subject: `[손세차장 의견] ${feedbackKindLabels[feedback.kind] || feedback.kind} · ${feedback.area}`,
        text: formatFeedbackEmail(feedback, contact),
        replyTo: contact.email,
      });
    } catch (error) {
      return emailFailure(response, error, { received: true, id });
    }
    return sendJson(response, 201, { received: true, id, emailDelivery: 'sent' });
  }

  if (request.method === 'POST' && url.pathname === '/api/consultations') {
    const address = requestAddress(request);
    if (!consultationAllowed(address)) return sendError(response, 429, '상담 요청은 한 시간에 8건까지 만들 수 있습니다. 잠시 후 다시 시도해 주세요.');
    const body = await readJsonBody(request);
    const contact = validateContact(body.contact, { required: true });
    const result = await consultationStore.create(body);
    try {
      await sendCustomerEmail({
        subject: `[후보지 검토 요청] ${result.consultation.snapshot?.candidateName || '후보지 검토'}`,
        text: formatCandidateEmail(result.consultation.snapshot, result.consultation.question, contact, result.consultation.receipt),
        replyTo: contact.email,
      });
      consultationStore.setEmailResult(result.consultation.receipt, 'sent');
      result.consultation.emailStatus = 'sent';
    } catch (error) {
      consultationStore.setEmailResult(result.consultation.receipt, error?.code === 'SMTP_NOT_CONFIGURED' ? 'not_configured' : 'failed', error?.code || 'SMTP_SEND_FAILED');
      return emailFailure(response, error, { receipt: result.consultation.receipt, accessKey: result.accessKey, received: true });
    }
    return sendJson(response, 201, { ...result, emailDelivery: 'sent' });
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
    const message = consultation.messages.at(-1) || { body: '' };
    try {
      await sendCustomerEmail({
        subject: `[후보지 상담 추가 메시지] ${publicMessageMatch[1]}`,
        text: formatConsultationMessageEmail(publicMessageMatch[1], message),
      });
      consultationStore.setEmailResult(publicMessageMatch[1], 'sent');
      return sendJson(response, 201, { consultation, emailDelivery: 'sent' });
    } catch (error) {
      consultationStore.setEmailResult(publicMessageMatch[1], error?.code === 'SMTP_NOT_CONFIGURED' ? 'not_configured' : 'failed', error?.code || 'SMTP_SEND_FAILED');
      return emailFailure(response, error, { consultation, received: true });
    }
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

  if (request.method === 'POST' && url.pathname === '/api/admin/product-images') {
    const image = await saveProductImage(await readJsonBody(request, 7_000_000));
    return sendJson(response, 201, { image });
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
    return withCatalogWriteLock(async () => {
      const body = await readJsonBody(request);
      const content = validateContent(body.content);
      await writeJsonAtomic(contentDataPath, content);
      return sendJson(response, 200, { content });
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/products') {
    return withCatalogWriteLock(async () => {
      const products = await loadProducts();
      const product = validateProduct(await readJsonBody(request));
      products.unshift(product);
      await writeJsonAtomic(productDataPath, products);
      return sendJson(response, 201, { product });
    });
  }

  const productMatch = url.pathname.match(/^\/api\/admin\/products\/([^/]+)$/);
  if (request.method === 'PUT' && productMatch) {
    const productId = decodeURIComponent(productMatch[1]);
    return withCatalogWriteLock(async () => {
      const products = await loadProducts();
      const index = products.findIndex((product) => String(product.id) === productId);
      if (index < 0) return sendError(response, 404, '상품을 찾을 수 없습니다.');
      const product = validateProduct(await readJsonBody(request), productId);
      products[index] = product;
      await writeJsonAtomic(productDataPath, products);
      return sendJson(response, 200, { product });
    });
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
  if (pathname === '/permit' || pathname === '/permit/') pathname = '/permit.html';
  if (pathname === '/guide' || pathname === '/guide/') pathname = '/guide.html';
  if (pathname === '/insurance' || pathname === '/insurance/') pathname = '/insurance.html';
  if (pathname === '/employment' || pathname === '/employment/') pathname = '/employment.html';
  if (pathname === '/privacy' || pathname === '/privacy/') pathname = '/privacy.html';
  if (pathname === '/admin') pathname = '/admin.html';
  if (pathname === '/admin/login') pathname = '/admin-login.html';
  const uploadedImage = pathname.match(/^\/product-images\/([A-Za-z0-9._-]+)$/);
  if (uploadedImage) {
    try {
      const imagePath = resolve(productImageRoot, uploadedImage[1]);
      const content = await readFile(imagePath);
      response.writeHead(200, securityHeaders({
        'content-type': mimeTypes[extname(imagePath)] || 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
      }));
      if (request.method === 'HEAD') return response.end();
      return response.end(content);
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('[product-image]', error);
    }
  }
  const filePath = resolve(distRoot, `.${pathname}`);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${sep}`)) {
    response.writeHead(403, securityHeaders({ 'content-type': 'text/plain; charset=utf-8' }));
    return response.end('Forbidden');
  }
  const adminPage = filePath === resolve(distRoot, 'admin.html');
  const loginPage = filePath === resolve(distRoot, 'admin-login.html');
  if (adminPage && !sessionFor(request)) {
    response.writeHead(302, securityHeaders({ location: '/admin/login', 'cache-control': 'no-store' }));
    return response.end();
  }
  if (loginPage && sessionFor(request)) {
    response.writeHead(302, securityHeaders({ location: '/admin.html', 'cache-control': 'no-store' }));
    return response.end();
  }
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
    const content = await readFile(filePath);
    const isHtml = extname(filePath) === '.html';
    response.writeHead(200, securityHeaders({
      'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream',
      'cache-control': adminPage || loginPage ? 'private, no-store' : isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
      ...(adminPage || loginPage ? { 'x-robots-tag': 'noindex, nofollow, noarchive' } : {}),
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
    if (request.method === 'GET' && url.pathname === '/healthz') {
      return sendJson(response, 200, { status: 'ok', service: 'sonsecha-startup-web' });
    }
    if (url.pathname.startsWith('/api/')) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && !sameOriginRequest(request)) {
        return sendError(response, 403, '허용되지 않은 요청 출처입니다.');
      }
      return await handleApi(request, response, url);
    }
    if (!['GET', 'HEAD'].includes(request.method)) return sendError(response, 405, '허용되지 않은 메서드입니다.');
    return await serveStatic(request, response, url);
  } catch (error) {
    if (error.message === 'BODY_TOO_LARGE') return sendError(response, 413, '요청 크기가 너무 큽니다.');
    if (error.message === 'INVALID_JSON') return sendError(response, 400, 'JSON 형식을 확인해 주세요.');
    if (error.message === 'CONSENT_REQUIRED') return sendError(response, 400, '공유 동의 후 전송할 수 있습니다.');
    if (error.message === 'PHOTO_LIMIT') return sendError(response, 400, '사진은 상담 건당 10장까지 보낼 수 있습니다.');
    if (error.message === 'PHOTO_SHARING_DISABLED') return sendError(response, 400, '사진 공유를 선택하지 않은 상담 건입니다.');
    if (error.message === 'CONTACT_REQUIRED') return sendError(response, 400, '이름·전화번호·이메일을 모두 입력해 주세요.');
    if (['REQUIRED_FIELD', 'FIELD_TOO_LONG', 'INVALID_URL', 'INVALID_PRICE', 'INVALID_FEATURED', 'INVALID_CATEGORY', 'INVALID_CONTENT', 'INVALID_ANALYTICS', 'INVALID_FEEDBACK', 'INVALID_CONTACT', 'INVALID_CONSULTATION', 'INVALID_PHOTO', 'INVALID_IMAGE'].includes(error.message)) {
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
