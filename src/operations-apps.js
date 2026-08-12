const appDefinitions = {
  inventory: {
    storageKey: 'sonsecha-app-inventory-v1',
    title: '재고관리 앱',
    subtitle: '약품, 타월, 필터, 결제용지 같은 운영 재고를 일자별로 기록합니다.',
    accent: '재고 기준 유지',
    fields: [
      { name: 'date', label: '기록일', type: 'date', required: true },
      { name: 'item', label: '품목명', type: 'text', required: true, placeholder: '예: 프리워시 약품' },
      { name: 'category', label: '구분', type: 'select', options: ['약품', '소모품', '필터', '결제용지', '기타'] },
      { name: 'currentStock', label: '현재 수량', type: 'number', required: true, min: '0', step: '0.1' },
      { name: 'minimumStock', label: '최소 수량', type: 'number', required: true, min: '0', step: '0.1' },
      { name: 'supplier', label: '공급처', type: 'text', placeholder: '예: 장비사 또는 약품사' },
      { name: 'note', label: '메모', type: 'textarea', placeholder: '희석비, 발주 예정일, 특이사항' },
    ],
    columns: [
      { key: 'date', label: '기록일' },
      { key: 'item', label: '품목' },
      { key: 'category', label: '구분' },
      { key: 'currentStock', label: '현재수량' },
      { key: 'minimumStock', label: '최소수량' },
      { key: 'supplier', label: '공급처' },
      { key: 'note', label: '메모' },
    ],
    summarize(entries) {
      const lowStockCount = entries.filter((entry) => toNumber(entry.currentStock) <= toNumber(entry.minimumStock)).length;
      const latestDate = newestDate(entries);
      return [
        { label: '등록 건수', value: `${entries.length}건` },
        { label: '부족 재고', value: `${lowStockCount}건` },
        { label: '최신 기록일', value: latestDate || '기록 없음' },
      ];
    },
  },
  sales: {
    storageKey: 'sonsecha-app-sales-v1',
    title: '매출관리 앱',
    subtitle: '일자별 매출과 차량 수, 코스 구성을 기록해 피크타임과 객단가를 확인합니다.',
    accent: '매출 흐름 점검',
    fields: [
      { name: 'date', label: '영업일', type: 'date', required: true },
      { name: 'course', label: '코스/서비스', type: 'text', required: true, placeholder: '예: 노터치 프리미엄' },
      { name: 'channel', label: '결제수단', type: 'select', options: ['현장결제', '회원권', '정기권', '손세차 추가', '기타'] },
      { name: 'sales', label: '매출액', type: 'number', required: true, min: '0', step: '1000' },
      { name: 'cars', label: '차량 수', type: 'number', required: true, min: '0', step: '1' },
      { name: 'refunds', label: '환불액', type: 'number', min: '0', step: '1000' },
      { name: 'note', label: '메모', type: 'textarea', placeholder: '날씨, 이벤트, 대기시간, 민원' },
    ],
    columns: [
      { key: 'date', label: '영업일' },
      { key: 'course', label: '코스' },
      { key: 'channel', label: '결제수단' },
      { key: 'sales', label: '매출액', format: 'currency' },
      { key: 'cars', label: '차량수' },
      { key: 'refunds', label: '환불액', format: 'currency' },
      { key: 'note', label: '메모' },
    ],
    summarize(entries) {
      const gross = entries.reduce((sum, entry) => sum + toNumber(entry.sales), 0);
      const refunds = entries.reduce((sum, entry) => sum + toNumber(entry.refunds), 0);
      const cars = entries.reduce((sum, entry) => sum + toNumber(entry.cars), 0);
      const net = gross - refunds;
      const avgTicket = cars > 0 ? Math.round(net / cars) : 0;
      return [
        { label: '순매출', value: formatCurrency(net) },
        { label: '누적 차량수', value: `${cars.toLocaleString('ko-KR')}대` },
        { label: '객단가', value: cars > 0 ? formatCurrency(avgTicket) : '기록 없음' },
      ];
    },
  },
  wastewater: {
    storageKey: 'sonsecha-app-wastewater-v1',
    title: '폐수관리 앱',
    subtitle: '세차폐수 발생량, 처리상태, 슬러지 인출과 점검 내용을 날짜별로 남깁니다.',
    accent: '환경 기록 유지',
    fields: [
      { name: 'date', label: '기록일', type: 'date', required: true },
      { name: 'line', label: '설비 구분', type: 'select', options: ['집수조', '유수분리', '재이용수', '슬러지', '배출라인'] },
      { name: 'inflow', label: '유입량(L)', type: 'number', min: '0', step: '1' },
      { name: 'treated', label: '처리량(L)', type: 'number', min: '0', step: '1' },
      { name: 'sludge', label: '슬러지 처리(kg)', type: 'number', min: '0', step: '0.1' },
      { name: 'contractor', label: '처리업체/점검자', type: 'text', placeholder: '예: 위탁업체명' },
      { name: 'status', label: '상태', type: 'select', options: ['정상', '주의', '조치필요'] },
      { name: 'note', label: '메모', type: 'textarea', placeholder: '악취, 넘침, 샘플채취, 점검 결과' },
    ],
    columns: [
      { key: 'date', label: '기록일' },
      { key: 'line', label: '설비' },
      { key: 'inflow', label: '유입량(L)' },
      { key: 'treated', label: '처리량(L)' },
      { key: 'sludge', label: '슬러지(kg)' },
      { key: 'contractor', label: '업체/점검자' },
      { key: 'status', label: '상태' },
      { key: 'note', label: '메모' },
    ],
    summarize(entries) {
      const inflow = entries.reduce((sum, entry) => sum + toNumber(entry.inflow), 0);
      const treated = entries.reduce((sum, entry) => sum + toNumber(entry.treated), 0);
      const warningCount = entries.filter((entry) => entry.status && entry.status !== '정상').length;
      return [
        { label: '누적 유입량', value: `${inflow.toLocaleString('ko-KR')}L` },
        { label: '누적 처리량', value: `${treated.toLocaleString('ko-KR')}L` },
        { label: '주의/조치', value: `${warningCount}건` },
      ];
    },
  },
  equipment: {
    storageKey: 'sonsecha-app-equipment-v1',
    title: '장비관리 앱',
    subtitle: '노터치 본체, 건조기, 펌프, 콤프레셔 같은 핵심 장비의 점검과 정비 이력을 남깁니다.',
    accent: '고장 예방 정비',
    fields: [
      { name: 'date', label: '점검일', type: 'date', required: true },
      { name: 'equipment', label: '장비명', type: 'text', required: true, placeholder: '예: 메인 본체 1호기' },
      { name: 'part', label: '부위/부품', type: 'text', placeholder: '예: 노즐, 펌프, 열선' },
      { name: 'status', label: '상태', type: 'select', options: ['정상', '예방정비', '수리필요', 'AS요청'] },
      { name: 'nextCheck', label: '다음 점검일', type: 'date' },
      { name: 'downtime', label: '정지시간(분)', type: 'number', min: '0', step: '1' },
      { name: 'owner', label: '담당자', type: 'text', placeholder: '예: 현장/장비사' },
      { name: 'note', label: '메모', type: 'textarea', placeholder: '증상, 교체 부품, AS 접수번호' },
    ],
    columns: [
      { key: 'date', label: '점검일' },
      { key: 'equipment', label: '장비명' },
      { key: 'part', label: '부위/부품' },
      { key: 'status', label: '상태' },
      { key: 'nextCheck', label: '다음 점검일' },
      { key: 'downtime', label: '정지시간(분)' },
      { key: 'owner', label: '담당자' },
      { key: 'note', label: '메모' },
    ],
    summarize(entries) {
      const repairCount = entries.filter((entry) => ['수리필요', 'AS요청'].includes(entry.status)).length;
      const downtime = entries.reduce((sum, entry) => sum + toNumber(entry.downtime), 0);
      const upcoming = nearestFutureDate(entries, 'nextCheck');
      return [
        { label: '수리/AS 건수', value: `${repairCount}건` },
        { label: '누적 정지시간', value: `${downtime.toLocaleString('ko-KR')}분` },
        { label: '다음 점검일', value: upcoming || '미정' },
      ];
    },
  },
  diary: {
    storageKey: 'sonsecha-app-diary-v1',
    title: '창업 일지 앱',
    subtitle: '오픈 1일차부터 매일 차량 수, 매출, 민원, 고장, 운영 메모를 기록합니다.',
    accent: '첫 30일 기록',
    fields: [
      { name: 'date', label: '기록일', type: 'date', required: true },
      { name: 'weather', label: '날씨', type: 'select', options: ['맑음', '흐림', '비', '눈', '기타'] },
      { name: 'cars', label: '차량 수', type: 'number', min: '0', step: '1' },
      { name: 'sales', label: '총매출', type: 'number', min: '0', step: '1000' },
      { name: 'complaints', label: '민원 건수', type: 'number', min: '0', step: '1' },
      { name: 'errors', label: '장비 오류 건수', type: 'number', min: '0', step: '1' },
      { name: 'note', label: '운영 메모', type: 'textarea', required: true, placeholder: '대기시간, 손세차 보완 요청, 이벤트 반응, 개선점' },
    ],
    columns: [
      { key: 'date', label: '기록일' },
      { key: 'weather', label: '날씨' },
      { key: 'cars', label: '차량수' },
      { key: 'sales', label: '총매출', format: 'currency' },
      { key: 'complaints', label: '민원' },
      { key: 'errors', label: '오류' },
      { key: 'note', label: '운영 메모' },
    ],
    summarize(entries) {
      const sales = entries.reduce((sum, entry) => sum + toNumber(entry.sales), 0);
      const complaints = entries.reduce((sum, entry) => sum + toNumber(entry.complaints), 0);
      const errors = entries.reduce((sum, entry) => sum + toNumber(entry.errors), 0);
      return [
        { label: '누적 매출', value: formatCurrency(sales) },
        { label: '누적 민원', value: `${complaints}건` },
        { label: '누적 오류', value: `${errors}건` },
      ];
    },
  },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `${toNumber(value).toLocaleString('ko-KR')}원`;
}

function formatCell(value, format) {
  if (value === undefined || value === null || value === '') return '—';
  if (format === 'currency') return formatCurrency(value);
  return escapeHtml(value);
}

function newestDate(entries) {
  return entries
    .map((entry) => entry.date)
    .filter(Boolean)
    .sort()
    .at(-1) || '';
}

function nearestFutureDate(entries, fieldName) {
  const today = new Date().toISOString().slice(0, 10);
  const futureDates = entries
    .map((entry) => entry[fieldName])
    .filter((value) => value && value >= today)
    .sort();
  return futureDates[0] || '';
}

function loadEntries(storageKey) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEntries(storageKey, entries) {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}

function defaultDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function fieldMarkup(field) {
  const value = field.type === 'date' ? defaultDateValue() : '';
  const common = `name="${escapeHtml(field.name)}"${field.required ? ' required' : ''}${field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : ''}`;
  if (field.type === 'textarea') {
    return `
      <label class="ops-field ops-field-wide">
        <span>${escapeHtml(field.label)}</span>
        <textarea ${common}>${escapeHtml(value)}</textarea>
      </label>
    `;
  }
  if (field.type === 'select') {
    return `
      <label class="ops-field">
        <span>${escapeHtml(field.label)}</span>
        <select name="${escapeHtml(field.name)}">
          ${field.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}
        </select>
      </label>
    `;
  }
  return `
    <label class="ops-field">
      <span>${escapeHtml(field.label)}</span>
      <input type="${escapeHtml(field.type)}" ${common}${field.min !== undefined ? ` min="${escapeHtml(field.min)}"` : ''}${field.step !== undefined ? ` step="${escapeHtml(field.step)}"` : ''} value="${escapeHtml(value)}" />
    </label>
  `;
}

function renderAppShell(app) {
  const root = document.querySelector('#opsApp');
  if (!root) return null;
  root.innerHTML = `
    <section class="ops-app-shell">
      <header class="ops-app-header">
        <div>
          <p class="ops-kicker">${escapeHtml(app.accent)}</p>
          <h1>${escapeHtml(app.title)}</h1>
          <p>${escapeHtml(app.subtitle)}</p>
        </div>
        <nav class="ops-nav-links">
          <a href="/operations-apps.html">앱 허브</a>
          <a href="/#roadmap">20단계 절차</a>
          <a href="/korea-touchless-report.html">리서치 보고서</a>
        </nav>
      </header>
      <section class="ops-summary" id="opsSummary"></section>
      <section class="ops-layout">
        <article class="ops-panel">
          <h2>새 기록 추가</h2>
          <form id="opsForm" class="ops-form">
            <div class="ops-grid">${app.fields.map(fieldMarkup).join('')}</div>
            <div class="ops-form-actions">
              <button type="submit">기록 저장</button>
              <button type="reset" class="secondary">입력 초기화</button>
            </div>
            <p class="ops-save-state" id="opsSaveState">로컬 브라우저에 저장합니다.</p>
          </form>
        </article>
        <article class="ops-panel">
          <div class="ops-table-head">
            <h2>기록 목록</h2>
            <button type="button" class="secondary" id="opsExportButton">JSON 복사</button>
          </div>
          <div class="ops-table-wrap">
            <table class="ops-table">
              <thead>
                <tr>
                  ${app.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}
                  <th>삭제</th>
                </tr>
              </thead>
              <tbody id="opsTableBody"></tbody>
            </table>
          </div>
          <p class="ops-empty" id="opsEmpty">아직 저장된 기록이 없습니다.</p>
        </article>
      </section>
    </section>
  `;
  return root;
}

function renderSummary(app, entries) {
  const summary = document.querySelector('#opsSummary');
  if (!summary) return;
  summary.innerHTML = app.summarize(entries).map((item) => `
    <article>
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </article>
  `).join('');
}

function renderTable(app, entries) {
  const tbody = document.querySelector('#opsTableBody');
  const empty = document.querySelector('#opsEmpty');
  if (!tbody || !empty) return;
  tbody.innerHTML = entries.map((entry) => `
    <tr data-entry-id="${escapeHtml(entry.id)}">
      ${app.columns.map((column) => `<td>${formatCell(entry[column.key], column.format)}</td>`).join('')}
      <td><button type="button" class="table-delete" data-delete-id="${escapeHtml(entry.id)}">삭제</button></td>
    </tr>
  `).join('');
  empty.hidden = entries.length > 0;
}

function formValues(form, fields) {
  const values = { id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}` };
  fields.forEach((field) => {
    const element = form.elements.namedItem(field.name);
    values[field.name] = element ? element.value.trim() : '';
  });
  return values;
}

function bindApp(app) {
  const form = document.querySelector('#opsForm');
  const saveState = document.querySelector('#opsSaveState');
  const exportButton = document.querySelector('#opsExportButton');
  if (!form || !saveState || !exportButton) return;

  let entries = loadEntries(app.storageKey);
  renderSummary(app, entries);
  renderTable(app, entries);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const entry = formValues(form, app.fields);
    entries = [entry, ...entries];
    saveEntries(app.storageKey, entries);
    renderSummary(app, entries);
    renderTable(app, entries);
    form.reset();
    app.fields.forEach((field) => {
      if (field.type === 'date') {
        const element = form.elements.namedItem(field.name);
        if (element) element.value = defaultDateValue();
      }
    });
    saveState.textContent = `저장 완료: ${new Date().toLocaleString('ko-KR')}`;
  });

  document.querySelector('#opsTableBody')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-id]');
    if (!button) return;
    entries = entries.filter((entry) => entry.id !== button.dataset.deleteId);
    saveEntries(app.storageKey, entries);
    renderSummary(app, entries);
    renderTable(app, entries);
    saveState.textContent = '기록을 삭제했습니다.';
  });

  exportButton.addEventListener('click', async () => {
    const payload = JSON.stringify(entries, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      saveState.textContent = 'JSON 데이터를 복사했습니다.';
    } catch {
      saveState.textContent = '클립보드 복사에 실패했습니다.';
    }
  });
}

function renderOperationsHub() {
  const root = document.querySelector('#opsAppHub');
  if (!root) return;
  const pages = [
    { href: '/inventory-app.html', title: '재고관리 앱', description: '약품·소모품·최소재고 관리', step: '17단계 연결' },
    { href: '/sales-app.html', title: '매출관리 앱', description: '일매출·객단가·코스별 매출 기록', step: '19단계 연결' },
    { href: '/wastewater-app.html', title: '폐수관리 앱', description: '유입량·처리량·슬러지·점검 기록', step: '5~7단계 연결' },
    { href: '/equipment-app.html', title: '장비관리 앱', description: '정비·AS·정지시간·다음 점검일 관리', step: '9, 18단계 연결' },
    { href: '/startup-diary-app.html', title: '창업 일지 앱', description: '오픈 1일차부터 매출·차량·민원 일지 기록', step: '12, 13단계 연결' },
    { href: '/washprice.html', title: 'WashPrice', description: '셀프세차장 단가를 지역별로 비교합니다.', step: '신규 MVP' },
  ];
  root.innerHTML = `
    <section class="ops-app-shell">
      <header class="ops-app-header">
        <div>
          <p class="ops-kicker">OPERATIONS APP LINKS</p>
          <h1>단계별 운영 앱 허브</h1>
          <p>20단계 안에는 링크만 두고, 실제 기록은 아래 별도 앱에서 관리하도록 분리했습니다.</p>
        </div>
        <nav class="ops-nav-links">
          <a href="/#roadmap">20단계 절차</a>
          <a href="/korea-touchless-report.html">리서치 보고서</a>
          <a href="/admin.html">관리자</a>
        </nav>
      </header>
      <section class="ops-summary">
        <article><span>분리 운영 원칙</span><strong>단계에는 링크만</strong></article>
        <article><span>구성 앱 수</span><strong>6개</strong></article>
        <article><span>기록 저장 방식</span><strong>브라우저 로컬 저장</strong></article>
      </section>
      <section class="ops-hub-grid">
        ${pages.map((page) => `
          <a class="ops-hub-card" href="${page.href}">
            <span>${escapeHtml(page.step)}</span>
            <strong>${escapeHtml(page.title)}</strong>
            <p>${escapeHtml(page.description)}</p>
            <em>앱 열기 →</em>
          </a>
        `).join('')}
      </section>
    </section>
  `;
}

function initializePage() {
  if (document.querySelector('#opsAppHub')) {
    renderOperationsHub();
    return;
  }
  const appKey = document.body.dataset.app;
  const app = appDefinitions[appKey];
  if (!app) return;
  renderAppShell(app);
  bindApp(app);
}

initializePage();
