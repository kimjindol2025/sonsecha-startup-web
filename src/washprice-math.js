function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
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
  const perMinutePrice = Math.ceil(basePrice * 60 / baseSeconds);
  const fiveMinute = calculateUsePrice(price, 300);
  const tenMinute = calculateUsePrice(price, 600);
  return {
    baseMinutes: baseSeconds / 60,
    perMinutePrice,
    fiveMinutePrice: fiveMinute ? fiveMinute.totalPrice : null,
    tenMinutePrice: tenMinute ? tenMinute.totalPrice : null,
  };
}

