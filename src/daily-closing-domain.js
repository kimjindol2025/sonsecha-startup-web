export const storageKey = 'sonsecha-app-daily-ledger-v1';
export const methods = { cash: '현금', card: '카드', easyPay: '간편결제', bank: '계좌이체' };
export const kinds = { income: '수입', expense: '지출', refund: '판매 환불' };
export const koreaDate = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(now);
export const emptyDay = () => ({ version: 0, transactions: [], closings: [] });

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function amount(value, label, min = 0) {
  const input = String(value ?? '').trim();
  const number = Number(input);
  requireValue(/^-?\d+$/.test(input) && Number.isSafeInteger(number) && number >= min, label + '에 올바른 원 단위 정수를 입력하세요.');
  return number;
}

function sum(values) {
  const total = values.reduce((result, value) => result + BigInt(value), 0n);
  requireValue(total <= BigInt(Number.MAX_SAFE_INTEGER) && total >= BigInt(Number.MIN_SAFE_INTEGER), '합계가 저장 범위를 초과했습니다.');
  return Number(total);
}

export function validateDate(date) {
  const parsed = new Date(date + 'T00:00:00Z');
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === date && date <= koreaDate(), '오늘 또는 이전의 올바른 영업일을 선택하세요.');
}

export function makeTransaction(input) {
  validateDate(input.date);
  requireValue(Object.hasOwn(kinds, input.kind) && input.operator && input.lines.length && input.payments.length, '거래 구분, 담당자, 품목, 결제수단을 입력하세요.');
  const lines = input.lines.map(line => {
    requireValue(line.name && line.unit, '품목명과 수량 단위를 입력하세요.');
    const quantity = amount(line.quantity, '수량', 1);
    const price = amount(line.price, '단가');
    const total = quantity * price;
    requireValue(Number.isSafeInteger(total), '품목 금액이 저장 범위를 초과했습니다.');
    return { ...line, quantity, price, total };
  });
  const payments = input.payments.map(payment => {
    requireValue(Object.hasOwn(methods, payment.method), '결제수단을 선택하세요.');
    return { method: payment.method, value: amount(payment.value, '결제 금액', 1) };
  });
  const total = sum(lines.map(line => line.total));
  requireValue(total > 0 && total === sum(payments.map(payment => payment.value)), '품목 합계와 결제 금액 합계를 맞춰 주세요.');
  if (input.kind === 'refund') requireValue(input.originalId && input.note, '환불은 원거래와 사유가 필요합니다.');
  return { ...input, lines, payments, total };
}

export function validateLedger(days, date, candidate) {
  const transactions = Object.entries({ ...days, [date]: candidate }).flatMap(([, day]) => day.transactions);
  const income = new Map(transactions.filter(tx => tx.kind === 'income').map(tx => [tx.id, tx]));
  const refunds = new Map();
  for (const tx of transactions.filter(tx => tx.kind === 'refund')) {
    const original = income.get(tx.originalId);
    requireValue(original && original.date <= tx.date, '환불의 원 수입 거래를 찾을 수 없습니다.');
    const total = sum([refunds.get(original.id) ?? 0, tx.total]);
    requireValue(total <= original.total, '누적 환불액이 원거래 금액을 초과합니다.');
    refunds.set(original.id, total);
  }
  summarize(candidate.transactions);
}

export function summarize(transactions) {
  const totals = Object.fromEntries(Object.keys(kinds).map(kind => [kind, sum(transactions.filter(tx => tx.kind === kind).map(tx => tx.total))]));
  const byMethod = Object.fromEntries(Object.keys(methods).map(method => {
    const values = Object.fromEntries(Object.keys(kinds).map(kind => [kind, sum(transactions.filter(tx => tx.kind === kind).flatMap(tx => tx.payments.filter(payment => payment.method === method).map(payment => payment.value)))]));
    return [method, { ...values, net: sum([values.income, -values.expense, -values.refund]) }];
  }));
  return { ...totals, netIncome: sum([totals.income, -totals.refund]), balance: sum([totals.income, -totals.refund, -totals.expense]), byMethod };
}

export function reconcile(method, totals, values) {
  const fields = method === 'cash'
    ? [['opening', '시작 시재', null], ['actual', '마감 실사액', sum([amount(values.opening, '시작 시재'), totals.net])]]
    : [['received', '확인 수납', totals.income], ['paid', '확인 지급·환불', sum([totals.expense, totals.refund])]];
  const comparisons = fields.map(([key, label, expected]) => {
    const actual = amount(values[key], label);
    return { key, actual, expected, difference: expected === null ? null : sum([actual, -expected]) };
  });
  requireValue(!comparisons.some(row => row.difference) || values.reason, methods[method] + ' 차이 사유를 입력하세요.');
  return { method, comparisons, reason: values.reason, reference: values.reference };
}

export function readLedger() {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return { schemaVersion: 1, days: {} };
  const ledger = JSON.parse(raw);
  requireValue(ledger?.schemaVersion === 1 && ledger.days && typeof ledger.days === 'object' && !Array.isArray(ledger.days)
    && Object.values(ledger.days).every(day => Number.isSafeInteger(day?.version) && Array.isArray(day.transactions) && Array.isArray(day.closings)), '장부 데이터 형식이 손상됐거나 지원되지 않습니다.');
  const validTransactions = (transactions, date) => transactions.every(tx => {
    if (tx?.date !== date || typeof tx.id !== 'string') return false;
    return makeTransaction(tx).total === tx.total;
  });
  for (const [date, day] of Object.entries(ledger.days)) {
    validateDate(date);
    requireValue(validTransactions(day.transactions, date) && day.closings.every((snapshot, index) =>
      snapshot?.revision === index + 1 && Array.isArray(snapshot.transactions) && validTransactions(snapshot.transactions, date)
      && Number.isSafeInteger(snapshot.summary?.balance) && Array.isArray(snapshot.checks)
      && snapshot.checks.every(check => Object.hasOwn(methods, check.method) && Array.isArray(check.comparisons))),
    '장부에 손상된 거래나 마감 기록이 있습니다.');
  }
  return ledger;
}

export async function saveDay(date, version, change) {
  requireValue(navigator.locks, '현재 브라우저에서 안전한 저장 잠금을 사용할 수 없습니다.');
  return navigator.locks.request(storageKey, () => {
    const ledger = readLedger();
    const day = ledger.days[date] ?? emptyDay();
    requireValue(day.version === version, '다른 탭에서 장부를 변경했습니다. 입력을 확인한 뒤 날짜를 다시 열어 주세요.');
    const next = change(day);
    validateLedger(ledger.days, date, next);
    next.version = version + 1;
    ledger.days[date] = next;
    localStorage.setItem(storageKey, JSON.stringify(ledger));
    return ledger;
  });
}
