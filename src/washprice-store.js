import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatMoney(value) {
  return `${toInt(value).toLocaleString('ko-KR')}원`;
}

export function formatDuration(seconds) {
  const value = toInt(seconds);
  if (value % 60 === 0) return `${value / 60}분`;
  return `${value}초`;
}

export function calculateUsePrice(price, targetSeconds) {
  if (!price) return null;
  const basePrice = toInt(price.base_price);
  const baseSeconds = Math.max(1, toInt(price.base_seconds));
  const extraPrice = toInt(price.extra_price);
  const extraSeconds = Math.max(1, toInt(price.extra_seconds));
  const usageSeconds = Math.max(0, toInt(targetSeconds));
  if (usageSeconds <= baseSeconds) {
    return { ...price, targetSeconds: usageSeconds, totalPrice: basePrice, extraRounds: 0 };
  }
  const remaining = usageSeconds - baseSeconds;
  const extraRounds = Math.ceil(remaining / extraSeconds);
  return {
    ...price,
    targetSeconds: usageSeconds,
    totalPrice: basePrice + (extraRounds * extraPrice),
    extraRounds,
  };
}

export function calculatePriceMetrics(price) {
  if (!price) return null;
  const basePrice = toInt(price.base_price);
  const baseSeconds = Math.max(1, toInt(price.base_seconds));
  const minutes = baseSeconds / 60;
  const perMinutePrice = Math.ceil(basePrice * 60 / baseSeconds);
  const fiveMinute = calculateUsePrice(price, 300);
  const tenMinute = calculateUsePrice(price, 600);
  return {
    baseMinutes: minutes,
    perMinutePrice,
    fiveMinutePrice: fiveMinute ? fiveMinute.totalPrice : null,
    tenMinutePrice: tenMinute ? tenMinute.totalPrice : null,
  };
}

function formatBaseLabel(price) {
  if (!price) return '미등록';
  return `${formatMoney(price.base_price)} / ${formatDuration(price.base_seconds)}`;
}

function formatFiveMinuteLabel(price) {
  const fiveMinute = calculateUsePrice(price, 300);
  return fiveMinute ? formatMoney(fiveMinute.totalPrice) : '미등록';
}

function normalizeStore(store) {
  const fallback = seedWashPriceStore();
  if (!store || typeof store !== 'object' || Array.isArray(store)) return fallback;
  return {
    version: 1,
    updatedAt: typeof store.updatedAt === 'string' ? store.updatedAt : fallback.updatedAt,
    nextIds: {
      carwash: toInt(store.nextIds?.carwash, fallback.nextIds.carwash),
      price: toInt(store.nextIds?.price, fallback.nextIds.price),
      servicePrice: toInt(store.nextIds?.servicePrice, fallback.nextIds.servicePrice),
      history: toInt(store.nextIds?.history, fallback.nextIds.history),
    },
    carwashes: Array.isArray(store.carwashes) ? store.carwashes.map(normalizeCarwash).filter(Boolean) : clone(fallback.carwashes),
    prices: Array.isArray(store.prices) ? store.prices.map(normalizePrice).filter(Boolean) : clone(fallback.prices),
    servicePrices: Array.isArray(store.servicePrices) ? store.servicePrices.map(normalizeServicePrice).filter(Boolean) : clone(fallback.servicePrices),
    priceHistory: Array.isArray(store.priceHistory) ? store.priceHistory.map(normalizeHistory).filter(Boolean) : clone(fallback.priceHistory),
  };
}

function normalizeCarwash(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    id: toInt(input.id),
    name: typeof input.name === 'string' ? input.name.trim() : '',
    address: typeof input.address === 'string' ? input.address.trim() : '',
    sido: typeof input.sido === 'string' ? input.sido.trim() : '',
    sigungu: typeof input.sigungu === 'string' ? input.sigungu.trim() : '',
    dong: typeof input.dong === 'string' ? input.dong.trim() : '',
    latitude: Number(input.latitude) || 0,
    longitude: Number(input.longitude) || 0,
    phone: typeof input.phone === 'string' ? input.phone.trim() : '',
    open_24h: Boolean(input.open_24h),
    card_available: Boolean(input.card_available),
    created_at: typeof input.created_at === 'string' ? input.created_at : nowIso(),
    updated_at: typeof input.updated_at === 'string' ? input.updated_at : nowIso(),
  };
}

function normalizePrice(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    id: toInt(input.id),
    carwash_id: toInt(input.carwash_id),
    base_price: toInt(input.base_price),
    base_seconds: toInt(input.base_seconds),
    extra_price: toInt(input.extra_price),
    extra_seconds: toInt(input.extra_seconds),
    verified_at: typeof input.verified_at === 'string' ? input.verified_at : '',
    source: typeof input.source === 'string' ? input.source.trim() : '',
    active: input.active !== false,
    created_at: typeof input.created_at === 'string' ? input.created_at : nowIso(),
  };
}

function normalizeServicePrice(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    id: toInt(input.id),
    carwash_id: toInt(input.carwash_id),
    service_type: typeof input.service_type === 'string' ? input.service_type.trim() : '',
    price: toInt(input.price),
    seconds: toInt(input.seconds),
    memo: typeof input.memo === 'string' ? input.memo.trim() : '',
  };
}

function normalizeHistory(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    id: toInt(input.id),
    carwash_id: toInt(input.carwash_id),
    base_price: toInt(input.base_price),
    base_seconds: toInt(input.base_seconds),
    extra_price: toInt(input.extra_price),
    extra_seconds: toInt(input.extra_seconds),
    verified_at: typeof input.verified_at === 'string' ? input.verified_at : '',
    created_at: typeof input.created_at === 'string' ? input.created_at : nowIso(),
  };
}

export function seedWashPriceStore() {
  const createdAt = '2026-08-12T00:00:00.000Z';
  return {
    version: 1,
    updatedAt: createdAt,
    nextIds: { carwash: 11, price: 13, servicePrice: 14, history: 5 },
    carwashes: [
      { id: 1, name: '영통 스카이셀프', address: '경기도 수원시 영통구 영통로 123', sido: '경기도', sigungu: '수원시 영통구', dong: '영통동', latitude: 37.2597, longitude: 127.0467, phone: '031-111-0101', open_24h: true, card_available: true, created_at: createdAt, updated_at: '2026-08-11T06:00:00.000Z' },
      { id: 2, name: '영통 센터워시', address: '경기도 수원시 영통구 봉영로 456', sido: '경기도', sigungu: '수원시 영통구', dong: '망포동', latitude: 37.2459, longitude: 127.0576, phone: '031-111-0102', open_24h: false, card_available: true, created_at: createdAt, updated_at: '2026-08-10T05:00:00.000Z' },
      { id: 3, name: '영통 오로라워시', address: '경기도 수원시 영통구 덕영대로 789', sido: '경기도', sigungu: '수원시 영통구', dong: '매탄동', latitude: 37.2671, longitude: 127.0289, phone: '031-111-0103', open_24h: false, card_available: false, created_at: createdAt, updated_at: '2026-08-09T07:00:00.000Z' },
      { id: 4, name: '영통 더클린', address: '경기도 수원시 영통구 신원로 31', sido: '경기도', sigungu: '수원시 영통구', dong: '원천동', latitude: 37.2712, longitude: 127.0551, phone: '031-111-0104', open_24h: true, card_available: true, created_at: createdAt, updated_at: '2026-08-08T06:30:00.000Z' },
      { id: 5, name: '영통 24시 워시', address: '경기도 수원시 영통구 대학로 55', sido: '경기도', sigungu: '수원시 영통구', dong: '이의동', latitude: 37.2953, longitude: 127.0459, phone: '031-111-0105', open_24h: true, card_available: true, created_at: createdAt, updated_at: '2026-08-11T10:15:00.000Z' },
      { id: 6, name: '권선 워시존', address: '경기도 수원시 권선구 권광로 121', sido: '경기도', sigungu: '수원시 권선구', dong: '권선동', latitude: 37.2572, longitude: 126.9645, phone: '031-111-0106', open_24h: false, card_available: true, created_at: createdAt, updated_at: '2026-08-11T08:00:00.000Z' },
      { id: 7, name: '권선 스피드셀프', address: '경기도 수원시 권선구 세류로 66', sido: '경기도', sigungu: '수원시 권선구', dong: '세류동', latitude: 37.2468, longitude: 126.9691, phone: '031-111-0107', open_24h: false, card_available: false, created_at: createdAt, updated_at: '2026-08-07T05:20:00.000Z' },
      { id: 8, name: '권선 남부세차', address: '경기도 수원시 권선구 곡선로 88', sido: '경기도', sigungu: '수원시 권선구', dong: '곡반정동', latitude: 37.2384, longitude: 126.9738, phone: '031-111-0108', open_24h: true, card_available: true, created_at: createdAt, updated_at: '2026-08-10T09:45:00.000Z' },
      { id: 9, name: '권선 굿워시', address: '경기도 수원시 권선구 서둔로 19', sido: '경기도', sigungu: '수원시 권선구', dong: '서둔동', latitude: 37.2784, longitude: 126.9718, phone: '031-111-0109', open_24h: false, card_available: true, created_at: createdAt, updated_at: '2026-08-12T00:00:00.000Z' },
      { id: 10, name: '권선 프리미엄셀프', address: '경기도 수원시 권선구 산업로 14', sido: '경기도', sigungu: '수원시 권선구', dong: '입북동', latitude: 37.2742, longitude: 126.9483, phone: '031-111-0110', open_24h: true, card_available: false, created_at: createdAt, updated_at: '2026-08-06T06:40:00.000Z' },
    ],
    prices: [
      { id: 1, carwash_id: 1, base_price: 3000, base_seconds: 180, extra_price: 1000, extra_seconds: 60, verified_at: '2026-08-11', source: '현장 가격표', active: true, created_at: '2026-08-11T06:00:00.000Z' },
      { id: 2, carwash_id: 2, base_price: 4000, base_seconds: 300, extra_price: 1000, extra_seconds: 60, verified_at: '2026-08-10', source: '현장 확인', active: true, created_at: '2026-08-10T05:00:00.000Z' },
      { id: 3, carwash_id: 3, base_price: 2500, base_seconds: 240, extra_price: 500, extra_seconds: 120, verified_at: '2026-08-09', source: '직접 촬영', active: true, created_at: '2026-08-09T07:00:00.000Z' },
      { id: 4, carwash_id: 4, base_price: 3500, base_seconds: 180, extra_price: 700, extra_seconds: 60, verified_at: '2026-08-08', source: '가격표 사진', active: true, created_at: '2026-08-08T06:30:00.000Z' },
      { id: 5, carwash_id: 5, base_price: 5000, base_seconds: 300, extra_price: 1000, extra_seconds: 60, verified_at: '2026-08-11', source: '오픈 이벤트 확인', active: true, created_at: '2026-08-11T10:15:00.000Z' },
      { id: 6, carwash_id: 6, base_price: 2000, base_seconds: 120, extra_price: 1500, extra_seconds: 60, verified_at: '2026-08-11', source: '현장 방문', active: true, created_at: '2026-08-11T08:00:00.000Z' },
      { id: 7, carwash_id: 7, base_price: 2800, base_seconds: 180, extra_price: 800, extra_seconds: 60, verified_at: '2026-08-07', source: '상호 문의', active: true, created_at: '2026-08-07T05:20:00.000Z' },
      { id: 8, carwash_id: 8, base_price: 4500, base_seconds: 300, extra_price: 500, extra_seconds: 120, verified_at: '2026-08-10', source: '가격표 사진', active: true, created_at: '2026-08-10T09:45:00.000Z' },
      { id: 9, carwash_id: 9, base_price: 3200, base_seconds: 180, extra_price: 1200, extra_seconds: 60, verified_at: '2026-08-12', source: '관리자 입력', active: true, created_at: '2026-08-12T00:00:00.000Z' },
      { id: 10, carwash_id: 10, base_price: 3800, base_seconds: 240, extra_price: 1000, extra_seconds: 60, verified_at: '2026-08-06', source: '현장 확인', active: true, created_at: '2026-08-06T06:40:00.000Z' },
      { id: 11, carwash_id: 1, base_price: 2800, base_seconds: 180, extra_price: 1000, extra_seconds: 60, verified_at: '2026-07-20', source: '이전 가격', active: false, created_at: '2026-07-20T04:00:00.000Z' },
      { id: 12, carwash_id: 6, base_price: 1800, base_seconds: 120, extra_price: 1500, extra_seconds: 60, verified_at: '2026-08-01', source: '이전 가격', active: false, created_at: '2026-08-01T08:00:00.000Z' },
    ],
    servicePrices: [
      { id: 1, carwash_id: 1, service_type: 'vacuum', price: 1000, seconds: 0, memo: '셀프 진공' },
      { id: 2, carwash_id: 1, service_type: 'air', price: 500, seconds: 0, memo: '에어건' },
      { id: 3, carwash_id: 2, service_type: 'foam', price: 1500, seconds: 0, memo: '폼건' },
      { id: 4, carwash_id: 3, service_type: 'mat', price: 1000, seconds: 0, memo: '매트세척기' },
      { id: 5, carwash_id: 4, service_type: 'underbody', price: 1000, seconds: 60, memo: '하부세차' },
      { id: 6, carwash_id: 5, service_type: 'vacuum', price: 1000, seconds: 0, memo: '진공청소기' },
      { id: 7, carwash_id: 6, service_type: 'foam', price: 2000, seconds: 0, memo: '거품 세차' },
      { id: 8, carwash_id: 7, service_type: 'air', price: 500, seconds: 0, memo: '에어건' },
      { id: 9, carwash_id: 8, service_type: 'vacuum', price: 1000, seconds: 0, memo: '진공' },
      { id: 10, carwash_id: 8, service_type: 'underbody', price: 1500, seconds: 60, memo: '하부세차' },
      { id: 11, carwash_id: 9, service_type: 'mat', price: 1000, seconds: 0, memo: '매트세척기' },
      { id: 12, carwash_id: 10, service_type: 'foam', price: 2000, seconds: 0, memo: '폼건' },
      { id: 13, carwash_id: 10, service_type: 'etc', price: 700, seconds: 0, memo: '타월 대여' },
    ],
    priceHistory: [
      { id: 1, carwash_id: 1, base_price: 2800, base_seconds: 180, extra_price: 1000, extra_seconds: 60, verified_at: '2026-07-20', created_at: '2026-07-20T04:00:00.000Z' },
      { id: 2, carwash_id: 6, base_price: 1800, base_seconds: 120, extra_price: 1500, extra_seconds: 60, verified_at: '2026-08-01', created_at: '2026-08-01T08:00:00.000Z' },
      { id: 3, carwash_id: 3, base_price: 2300, base_seconds: 240, extra_price: 500, extra_seconds: 120, verified_at: '2026-07-28', created_at: '2026-07-28T09:10:00.000Z' },
      { id: 4, carwash_id: 9, base_price: 3000, base_seconds: 180, extra_price: 1200, extra_seconds: 60, verified_at: '2026-07-30', created_at: '2026-07-30T12:00:00.000Z' },
    ],
  };
}

export function loadWashPriceStorePath(dataRoot) {
  return resolve(dataRoot, 'washprice.json');
}

export async function loadWashPriceStore(dataRoot) {
  const pathname = loadWashPriceStorePath(dataRoot);
  try {
    const parsed = JSON.parse(await readFile(pathname, 'utf8'));
    return normalizeStore(parsed);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[washprice] Failed to read store:', error);
    return seedWashPriceStore();
  }
}

export async function saveWashPriceStore(dataRoot, store) {
  const pathname = loadWashPriceStorePath(dataRoot);
  await mkdir(dataRoot, { recursive: true });
  const temp = `${pathname}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, pathname);
}

function carwashPrices(store, carwashId) {
  return store.prices.filter((price) => price.carwash_id === carwashId);
}

function activePrice(store, carwashId) {
  return carwashPrices(store, carwashId).find((price) => price.active !== false) || null;
}

function servicePrices(store, carwashId) {
  return store.servicePrices.filter((service) => service.carwash_id === carwashId);
}

function priceHistory(store, carwashId) {
  return store.priceHistory.filter((history) => history.carwash_id === carwashId).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function decoratedCarwash(store, carwash) {
  const price = activePrice(store, carwash.id);
  return {
    ...carwash,
    activePrice: price,
    priceMetrics: calculatePriceMetrics(price),
    basePriceLabel: formatBaseLabel(price),
    fiveMinuteLabel: formatFiveMinuteLabel(price),
    servicePrices: servicePrices(store, carwash.id),
    priceHistory: priceHistory(store, carwash.id),
    priceRegistered: Boolean(price),
  };
}

export function decorateWashPriceState(store) {
  const decorated = store.carwashes
    .map((carwash) => decoratedCarwash(store, carwash))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const registered = decorated.filter((carwash) => carwash.priceRegistered);
  const regionCounts = {};
  decorated.forEach((carwash) => {
    const key = `${carwash.sido} ${carwash.sigungu}`;
    regionCounts[key] = (regionCounts[key] || 0) + 1;
  });
  const recent30 = registered.filter((carwash) => {
    const verified = carwash.activePrice?.verified_at || '';
    if (!verified) return false;
    return verified >= '2026-07-13';
  });
  return {
    summary: {
      totalCarwashes: decorated.length,
      priceRegistered: registered.length,
      priceUnregistered: decorated.length - registered.length,
      recent30Count: recent30.length,
      regionCounts,
    },
    regions: {
      sido: uniqueSorted(decorated.map((carwash) => carwash.sido).filter(Boolean)),
      sigungu: uniqueSorted(decorated.map((carwash) => carwash.sigungu).filter(Boolean)),
      dong: uniqueSorted(decorated.map((carwash) => carwash.dong).filter(Boolean)),
    },
    carwashes: decorated,
  };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'ko'));
}

function nextId(store, key) {
  const value = toInt(store.nextIds?.[key], 1);
  store.nextIds[key] = value + 1;
  return value;
}

export function createCarwashRecord(store, input) {
  const timestamp = nowIso();
  const carwash = {
    id: nextId(store, 'carwash'),
    name: input.name,
    address: input.address,
    sido: input.sido,
    sigungu: input.sigungu,
    dong: input.dong,
    latitude: toNumber(input.latitude),
    longitude: toNumber(input.longitude),
    phone: input.phone,
    open_24h: Boolean(input.open_24h),
    card_available: Boolean(input.card_available),
    created_at: timestamp,
    updated_at: timestamp,
  };
  store.carwashes.unshift(carwash);
  store.updatedAt = timestamp;
  return carwash;
}

export function updateCarwashRecord(store, carwashId, input) {
  const carwash = store.carwashes.find((item) => item.id === toInt(carwashId));
  if (!carwash) return null;
  carwash.name = input.name;
  carwash.address = input.address;
  carwash.sido = input.sido;
  carwash.sigungu = input.sigungu;
  carwash.dong = input.dong;
  carwash.latitude = toNumber(input.latitude);
  carwash.longitude = toNumber(input.longitude);
  carwash.phone = input.phone;
  carwash.open_24h = Boolean(input.open_24h);
  carwash.card_available = Boolean(input.card_available);
  carwash.updated_at = nowIso();
  store.updatedAt = carwash.updated_at;
  return carwash;
}

export function deleteCarwashRecord(store, carwashId) {
  const id = toInt(carwashId);
  const before = store.carwashes.length;
  store.carwashes = store.carwashes.filter((carwash) => carwash.id !== id);
  store.prices = store.prices.filter((price) => price.carwash_id !== id);
  store.servicePrices = store.servicePrices.filter((service) => service.carwash_id !== id);
  store.priceHistory = store.priceHistory.filter((history) => history.carwash_id !== id);
  if (store.carwashes.length !== before) {
    store.updatedAt = nowIso();
    return true;
  }
  return false;
}

export function upsertPriceRecord(store, carwashId, input) {
  const id = toInt(carwashId);
  const carwash = store.carwashes.find((item) => item.id === id);
  if (!carwash) return null;
  const timestamp = nowIso();
  const current = store.prices.find((price) => price.carwash_id === id && price.active !== false);
  if (current) {
    current.active = false;
    store.priceHistory.unshift({
      id: nextId(store, 'history'),
      carwash_id: id,
      base_price: current.base_price,
      base_seconds: current.base_seconds,
      extra_price: current.extra_price,
      extra_seconds: current.extra_seconds,
      verified_at: current.verified_at,
      created_at: current.created_at,
    });
  }
  const price = {
    id: nextId(store, 'price'),
    carwash_id: id,
    base_price: toInt(input.base_price),
    base_seconds: toInt(input.base_seconds),
    extra_price: toInt(input.extra_price),
    extra_seconds: toInt(input.extra_seconds),
    verified_at: input.verified_at,
    source: input.source,
    active: true,
    created_at: timestamp,
  };
  store.prices.unshift(price);
  carwash.updated_at = timestamp;
  store.updatedAt = timestamp;
  return price;
}

export function replaceServicePrices(store, carwashId, items) {
  const id = toInt(carwashId);
  const carwash = store.carwashes.find((item) => item.id === id);
  if (!carwash) return null;
  store.servicePrices = store.servicePrices.filter((service) => service.carwash_id !== id);
  items.forEach((item) => {
    store.servicePrices.push({
      id: nextId(store, 'servicePrice'),
      carwash_id: id,
      service_type: item.service_type,
      price: toInt(item.price),
      seconds: toInt(item.seconds),
      memo: item.memo,
    });
  });
  carwash.updated_at = nowIso();
  store.updatedAt = carwash.updated_at;
  return servicePrices(store, id);
}

