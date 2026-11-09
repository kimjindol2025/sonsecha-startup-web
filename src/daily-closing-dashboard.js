import { koreaDate, readLedger, storageKey, summarize, validateDate } from './daily-closing-domain.js';

const form = document.querySelector('#period');
const root = document.querySelector('#dashboard');
const message = document.querySelector('#message');
const today = koreaDate();
const formatter = new Intl.NumberFormat('ko-KR');
const money = value => formatter.format(value) + '원';
const fields = {
  income: '수입', refund: '판매 환불', expense: '지출', netIncome: '순수입', balance: '수입·지출 차액',
};

function row(date, day) {
  const snapshot = day.closings.at(-1);
  const transactions = snapshot?.transactions ?? day.transactions;
  const summary = snapshot?.summary ?? summarize(transactions);
  const difference = snapshot?.checks.some(check => check.comparisons.some(item => item.difference));
  return { date, summary, snapshot, difference, count: transactions.length };
}

function render() {
  try {
    const { start, end } = Object.fromEntries(new FormData(form));
    validateDate(start);
    validateDate(end);
    if (start > end) throw new Error('시작일이 종료일보다 늦습니다.');
    const rows = Object.entries(readLedger().days)
      .filter(([date, day]) => date >= start && date <= end && (day.transactions.length || day.closings.length))
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([date, day]) => row(date, day));
    const closed = rows.filter(item => item.snapshot);
    const pending = rows.filter(item => !item.snapshot);
    const total = key => closed.reduce((sum, item) => sum + BigInt(item.summary[key]), 0n);
    const cards = Object.entries(fields).map(([key, label]) => `<div>${label}<strong>${money(total(key))}</strong></div>`).join('');
    root.innerHTML = `
      <section class="closing-card"><h2>확정 금액 합계</h2>
        <p>확정 ${closed.length}일 · 미마감 ${pending.length}일 · 대조 차이 기록 ${closed.filter(item => item.difference).length}일</p>
        <div class="closing-summary">${cards}</div>
        <p>미마감 금액은 위 합계에서 제외합니다.</p>
      </section>
      <section class="closing-card"><h2>영업일별 장부</h2>
        ${rows.length ? rows.map(item => `<article class="dashboard-day">
          <h3><a href="./daily-closing-app.html?date=${item.date}">${item.date} 장부 열기 →</a></h3>
          <p>${item.snapshot ? `마감 확정 · ${item.snapshot.revision}차` : '미마감 · 잠정 금액'} · 거래 ${item.count}건${item.difference ? ' · 대조 차이 있음' : ''}</p>
          <p>수입 ${money(item.summary.income)} · 환불 ${money(item.summary.refund)} · 지출 ${money(item.summary.expense)}</p>
          <p><strong>수입·지출 차액 ${money(item.summary.balance)}</strong></p>
        </article>`).join('') : '<p>선택한 기간에 기록된 장부가 없습니다.</p>'}
      </section>`;
    message.hidden = true;
  } catch (error) {
    root.replaceChildren();
    message.textContent = error.message;
    message.hidden = false;
    message.setAttribute('data-error', '');
  }
}

function choosePeriod(period) {
  form.elements.start.value = period === 'today' ? today : today.slice(0, 7) + '-01';
  form.elements.end.value = today;
  render();
}

for (const name of ['start', 'end']) form.elements[name].max = today;
form.addEventListener('submit', event => { event.preventDefault(); render(); });
form.addEventListener('click', event => {
  const button = event.target.closest('[data-period]');
  if (button) choosePeriod(button.dataset.period);
});
window.addEventListener('storage', event => { if (event.key === storageKey || event.key === null) render(); });
window.addEventListener('pageshow', render);
choosePeriod('month');
