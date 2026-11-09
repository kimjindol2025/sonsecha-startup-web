import { amount, emptyDay, kinds, koreaDate, makeTransaction, methods, readLedger, reconcile, saveDay, summarize, validateDate, validateLedger } from './daily-closing-domain.js';

const root = document.querySelector('#closing');
const dateInput = document.querySelector('#date');
const message = document.querySelector('#message');
const status = document.querySelector('#status');
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const money = value => new Intl.NumberFormat('ko-KR').format(value) + '원';
const options = (entries, selected) => Object.entries(entries).map(([value, label]) =>
  `<option value="${escape(value)}"${value === selected ? ' selected' : ''}>${escape(label)}</option>`).join('');
const input = (label, name, value = '', numeric = false) =>
  `<label>${label}<input name="${name}" value="${escape(value)}"${numeric ? ' inputmode="numeric"' : ''}></label>`;

let ledger;
let date = koreaDate();
let day;
let correction;
let editId;
let busy = false;
let transactionDirty = false;
let closingDirty = false;

function notify(text = '', error = false) {
  message.hidden = !text;
  message.textContent = text;
  message.toggleAttribute('data-error', error);
}

function selectDate(next) {
  try {
    validateDate(next);
    ledger = readLedger();
    date = next;
    day = ledger.days[date] ?? emptyDay();
    dateInput.value = date;
    correction = null;
    editId = null;
    render();
    notify();
  } catch (error) {
    dateInput.value = date;
    if (!day) root.replaceChildren();
    notify(error.message, true);
  }
}

function lineRow(line = {}) {
  return `<div class="closing-row" data-line>
    ${input('품목·서비스', 'item', line.name)}
    ${input('수량', 'quantity', line.quantity, true)}
    ${input('단위', 'unit', line.unit)}
    ${input('단가 (원)', 'price', line.price, true)}
    <button type="button" data-action="remove-row">줄 제거</button>
  </div>`;
}

function paymentRow(payment = {}) {
  return `<div class="closing-row" data-payment>
    <label>결제수단<select name="method">${options(methods, payment.method)}</select></label>
    ${input('결제 금액 (원)', 'value', payment.value, true)}
    <button type="button" data-action="remove-row">줄 제거</button>
  </div>`;
}

function previousSales() {
  try {
    const rows = JSON.parse(localStorage.getItem('sonsecha-app-sales-v1') ?? '[]');
    const matches = rows.filter(row => row.date === date);
    if (!matches.length) return '';
    return `<details><summary>기존 매출 앱 기록 ${matches.length}건 · 참고용</summary>
      <p>일일 장부에 자동 합산하지 않습니다.</p>
      <ul>${matches.map(row => `<li>${escape(row.course)} · ${escape(row.channel)} · ${escape(row.sales)}원</li>`).join('')}</ul></details>`;
  } catch {
    return '<p>기존 매출 앱 기록을 읽을 수 없습니다.</p>';
  }
}

function transactionForm(transactions) {
  const tx = transactions.find(record => record.id === editId);
  const originals = Object.entries(ledger.days).flatMap(([key, value]) => key === date ? [] : value.transactions)
    .concat(transactions).filter(record => record.kind === 'income' && record.date <= date);
  const originalOptions = Object.fromEntries(originals.map(record => [record.id, `${record.date} · ${record.lines[0].name} · ${money(record.total)}`]));
  return `<section class="closing-card"><h2>${tx ? '거래 수정' : '거래 입력'}</h2>
    <form id="transaction">
      <div class="closing-row"><label>거래 구분<select name="kind">${options(kinds, tx?.kind)}</select></label>${input('담당자', 'operator', tx?.operator)}</div>
      <fieldset><legend>판매·구매 품목</legend><div id="lines">${(tx?.lines ?? [{}]).map(lineRow).join('')}</div>
      <button type="button" data-action="add-line">품목 추가</button><output id="line-total"></output></fieldset>
      <fieldset><legend>수납·지급 수단</legend><div id="payments">${(tx?.payments ?? [{}]).map(paymentRow).join('')}</div>
      <button type="button" data-action="add-payment">결제수단 추가</button><output id="payment-total"></output></fieldset>
      <label data-refund ${tx?.kind === 'refund' ? '' : 'hidden'}>환불 원거래<select name="originalId"><option value="">원거래 선택</option>${options(originalOptions, tx?.originalId)}</select></label>
      ${input('메모 (환불은 사유 필수)', 'note', tx?.note)}
      ${input('증빙 참조 (선택)', 'reference', tx?.reference)}
      <div class="closing-actions"><button class="primary">거래 저장</button><button type="button" data-action="cancel-edit">입력 취소</button></div>
    </form>${previousSales()}</section>`;
}

function transactionList(transactions, editable, prefix) {
  return transactions.length ? transactions.map(tx => `<details data-kind="${escape(tx.kind)}">
    <summary>${kinds[tx.kind]} · ${escape(tx.lines.map(line => line.name).join(', '))} · ${money(tx.total)}</summary>
    <ul>${tx.lines.map(line => `<li>${escape(line.name)} · ${line.quantity}${escape(line.unit)} × ${money(line.price)} = ${money(line.total)}</li>`).join('')}</ul>
    <p>${tx.payments.map(payment => methods[payment.method] + ' ' + money(payment.value)).join(' / ')}</p>
    <p>담당자 ${escape(tx.operator)} · ${escape(new Date(tx.occurredAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))}</p>
    ${tx.note ? `<p>메모 ${escape(tx.note)}</p>` : ''}${tx.reference ? `<p>증빙 ${escape(tx.reference)}</p>` : ''}
    ${tx.originalId ? `<p>원거래 ID ${escape(tx.originalId)}</p>` : ''}
    <small>거래 ID ${escape(tx.id)}</small>
    ${editable ? `<div class="closing-actions"><button type="button" data-action="edit" data-id="${escape(tx.id)}">수정</button><button type="button" data-action="delete" data-id="${escape(tx.id)}">삭제</button></div>` : ''}
  </details>`).join('') : `<p>${prefix} 거래가 없습니다.</p>`;
}

function reconciliationForm(summary, transactions) {
  const checks = Object.entries(methods).filter(([key]) => key === 'cash' || Object.keys(kinds).some(kind => summary.byMethod[key][kind]));
  return `<section class="closing-card"><h2>금액 대조와 마감</h2>
    <p>카드 승인과 정산 입금을 한 번만 기록하세요. 확인값이 0원이면 0을 입력하세요.</p>
    <form id="close-day">
      ${checks.map(([method, label]) => {
        const totals = summary.byMethod[method];
        return `<fieldset data-check="${method}"><legend>${label}</legend>
          <p>장부 수납 ${money(totals.income)} · 지급 ${money(totals.expense)} · 환불 ${money(totals.refund)}</p>
          <div class="closing-row">${method === 'cash' ? input('시작 시재 (원)', 'opening', '', true) + input('마감 실사액 (원)', 'actual', '', true)
            : input('확인 수납 (원)', 'received', '', true) + input('확인 지급·환불 (원)', 'paid', '', true)}</div>
          <output data-difference></output>
          ${input('차이 사유', 'reason')}${input('증빙 참조 (선택)', 'reference')}
        </fieldset>`;
      }).join('')}
      ${input('카드 정산 예정액 (선택·참고)', 'cardExpected', '', true)}
      ${input('마감 담당자', 'operator')}
      ${transactions.length ? '' : '<label><span><input type="checkbox" name="noTransactions"> 거래 없음 확인</span></label>'}
      <button class="primary">${correction ? '정정본 확정' : '마감 확정'}</button>
    </form></section>`;
}

function render() {
  transactionDirty = false;
  closingDirty = false;
  const latest = day.closings.at(-1);
  const editable = !latest || Boolean(correction);
  const transactions = correction?.transactions ?? latest?.transactions ?? day.transactions;
  const summary = summarize(transactions);
  status.textContent = correction ? '정정 중' : latest ? `마감 확정 · ${latest.revision}차` : '미마감';
  root.innerHTML = `<section class="closing-summary" aria-label="당일 장부 합계">
    ${Object.entries(kinds).map(([key, label]) => `<button type="button" data-action="filter" data-id="${key}">${label}<strong>${money(summary[key])}</strong></button>`).join('')}
    <div>순수입<strong>${money(summary.netIncome)}</strong></div><div>수입·지출 차액<strong>${money(summary.balance)}</strong></div>
  </section>
  ${editable ? transactionForm(transactions) : ''}
  <section class="closing-card" id="transactions"><h2>거래 내역 · ${transactions.length}건</h2>
    <button type="button" data-action="filter" data-id="">전체 보기</button>
    <p id="filter-state" aria-live="polite"></p>${transactionList(transactions, editable, '당일')}</section>
  ${editable ? reconciliationForm(summary, transactions) : ''}
  ${latest ? `<section class="closing-card"><h2>확정 이력</h2>
    ${correction ? '<button type="button" data-action="cancel-correction">정정 취소</button>' : '<button type="button" data-action="correct">정정 시작</button>'}
    ${[...day.closings].reverse().map(snapshot => `<details><summary>${snapshot.revision}차 · ${escape(snapshot.operator)} · ${money(snapshot.summary.balance)}</summary>
      <p>${escape(new Date(snapshot.closedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))} ${escape(snapshot.reason)}</p>
      ${snapshot.cardExpected === null ? '' : `<p>카드 정산 예정액 (참고) ${money(snapshot.cardExpected)}</p>`}
      ${snapshot.checks.map(check => `<p>${methods[check.method]} · ${check.comparisons.map(row => row.expected === null ? `시작 시재 ${money(row.actual)}` : `확인 ${money(row.actual)} / 기대 ${money(row.expected)} / 차이 ${money(row.difference)}`).join(' · ')} · ${escape(check.reason)} ${escape(check.reference)}</p>`).join('')}
      ${transactionList(snapshot.transactions, false, '확정')}</details>`).join('')}</section>` : ''}`;
  updatePreviews();
}

function fields(container) {
  return Object.fromEntries([...container.querySelectorAll('input:not([type=checkbox]),select')].map(element => [element.name, element.value.trim()]));
}

function updatePreviews() {
  const form = document.querySelector('#transaction');
  if (form) {
    form.querySelector('[data-refund]').hidden = form.elements.kind.value !== 'refund';
    const totals = (selector, target, calculate) => {
      try {
        const value = [...form.querySelectorAll(selector)].reduce((total, row) => total + calculate(fields(row)), 0);
        if (!Number.isSafeInteger(value)) throw new Error();
        document.querySelector(target).textContent = money(value);
      } catch {
        document.querySelector(target).textContent = '금액 입력 대기';
      }
    };
    totals('[data-line]', '#line-total', row => amount(row.quantity, '수량', 1) * amount(row.price, '단가'));
    totals('[data-payment]', '#payment-total', row => amount(row.value, '결제 금액', 1));
  }
  const summary = summarize(correction?.transactions ?? day.transactions);
  for (const group of root.querySelectorAll('[data-check]')) {
    const output = group.querySelector('output');
    try {
      const result = reconcile(group.dataset.check, summary.byMethod[group.dataset.check], { ...fields(group), reason: '미리보기' });
      output.textContent = result.comparisons.filter(row => row.expected !== null).map(row =>
        `기대 ${money(row.expected)} · 차이 ${money(row.difference)}`).join(' / ');
    } catch {
      output.textContent = '확인 금액 입력 대기';
    }
  }
}

async function commit(change) {
  ledger = await saveDay(date, day.version, change);
  day = ledger.days[date];
}

async function withSave(action) {
  if (busy) return;
  busy = true;
  const controls = [dateInput, ...root.querySelectorAll('button')];
  controls.forEach(control => { control.disabled = true; });
  try {
    await action();
  } catch (error) {
    notify(error.name === 'QuotaExceededError' ? '저장 공간이 부족합니다. 입력을 유지했습니다.' : error.message, true);
  } finally {
    busy = false;
    controls.forEach(control => { control.disabled = false; });
  }
}

async function updateTransactions(transactions) {
  if (correction) {
    validateLedger(ledger.days, date, { ...day, transactions });
    correction.transactions = transactions;
  } else {
    await commit(current => ({ ...current, transactions }));
  }
  editId = null;
  render();
  notify(correction ? '정정 초안에 반영했습니다.' : '거래를 저장했습니다.');
}

function onInput(event) {
  if (event.target.closest('#transaction')) transactionDirty = true;
  if (event.target.closest('#close-day')) closingDirty = true;
  updatePreviews();
}
root.addEventListener('input', onInput);
root.addEventListener('change', onInput);
root.addEventListener('submit', event => {
  event.preventDefault();
  void withSave(async () => {
    const form = event.target;
    const values = fields(form);
    const transactions = correction?.transactions ?? day.transactions;
    if (form.id === 'transaction') {
      if (closingDirty && !window.confirm('거래를 저장하면 대조값을 다시 입력해야 합니다. 계속할까요?')) return;
      const tx = makeTransaction({
        id: editId ?? crypto.randomUUID(), date,
        occurredAt: transactions.find(record => record.id === editId)?.occurredAt ?? new Date().toISOString(),
        kind: values.kind, operator: values.operator, note: values.note, reference: values.reference,
        originalId: values.kind === 'refund' ? values.originalId : '',
        lines: [...form.querySelectorAll('[data-line]')].map(row => {
          const { item, quantity, unit, price } = fields(row);
          return { name: item, quantity, unit, price };
        }),
        payments: [...form.querySelectorAll('[data-payment]')].map(fields),
      });
      await updateTransactions(editId ? transactions.map(record => record.id === editId ? tx : record) : [...transactions, tx]);
      return;
    }
    if (transactionDirty) throw new Error('입력 중인 거래를 먼저 저장하거나 취소하세요.');
    if (!values.operator) throw new Error('마감 담당자를 입력하세요.');
    if (!transactions.length && !form.elements.noTransactions.checked) throw new Error('거래 없음 확인을 선택하세요.');
    const summary = summarize(transactions);
    const checks = [...form.querySelectorAll('[data-check]')].map(group => reconcile(group.dataset.check, summary.byMethod[group.dataset.check], fields(group)));
    const cardExpected = values.cardExpected === '' ? null : amount(values.cardExpected, '카드 정산 예정액');
    await commit(current => ({ ...current, transactions, closings: [...current.closings, {
      revision: current.closings.length + 1, transactions, checks, summary, operator: values.operator,
      closedAt: new Date().toISOString(), reason: correction?.reason ?? '', cardExpected,
    }] }));
    correction = null;
    editId = null;
    render();
    notify('마감을 확정했습니다.');
  });
});

root.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || busy) return;
  const { action, id } = button.dataset;
  if (action === 'add-line' || action === 'add-payment') {
    transactionDirty = true;
    const isLine = action === 'add-line';
    const container = document.querySelector(isLine ? '#lines' : '#payments');
    container.insertAdjacentHTML('beforeend', isLine ? lineRow() : paymentRow());
    container.lastElementChild.querySelector('input,select').focus();
    updatePreviews();
  }
  if (action === 'remove-row') {
    transactionDirty = true;
    const row = button.closest('[data-line],[data-payment]');
    if (row.parentElement.children.length > 1) row.remove();
    updatePreviews();
  }
  if (action === 'filter') {
    const list = document.querySelector('#transactions');
    const matches = [...list.querySelectorAll('details')].filter(record => {
      record.hidden = Boolean(id && record.dataset.kind !== id);
      return !record.hidden;
    });
    document.querySelector('#filter-state').textContent = `${kinds[id] ?? '전체'} ${matches.length}건`;
    list.scrollIntoView({ block: 'nearest' });
  }
  if (action === 'edit' || action === 'cancel-edit') {
    if ((transactionDirty || closingDirty) && !window.confirm('저장하지 않은 화면 입력을 버릴까요?')) return;
    editId = id;
    render();
    document.querySelector('#transaction').scrollIntoView();
  }
  if (action === 'delete' && window.confirm('이 거래를 삭제할까요? 저장하지 않은 화면 입력도 지워집니다.')) {
    void withSave(() => updateTransactions((correction?.transactions ?? day.transactions).filter(tx => tx.id !== id)));
  }
  if (action === 'correct') {
    const reason = window.prompt('정정 사유를 입력하세요.')?.trim();
    if (!reason) return;
    correction = { reason, transactions: structuredClone(day.closings.at(-1).transactions) };
    render();
  }
  if (action === 'cancel-correction' && window.confirm('정정 초안을 버릴까요?')) {
    correction = null;
    editId = null;
    render();
  }
});

dateInput.max = date;
dateInput.addEventListener('change', () => {
  if ((correction || transactionDirty || closingDirty) && !window.confirm('저장하지 않은 입력을 버리고 날짜를 바꿀까요?')) {
    dateInput.value = date;
    return;
  }
  selectDate(dateInput.value);
});
document.querySelector('#backup').addEventListener('click', () => {
  try {
    const url = URL.createObjectURL(new Blob([JSON.stringify(readLedger(), null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bigwash-daily-ledger-' + koreaDate() + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    notify(error.message, true);
  }
});
selectDate(date);
