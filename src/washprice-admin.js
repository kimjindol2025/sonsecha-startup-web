import { calculatePriceMetrics, calculateUsePrice, formatDuration, formatMoney } from './washprice-math.js';

const serviceTypes = [
  { service_type: 'vacuum', label: '진공청소기' },
  { service_type: 'foam', label: '폼건' },
  { service_type: 'underbody', label: '하부세차' },
  { service_type: 'mat', label: '매트세척기' },
  { service_type: 'air', label: '에어건' },
  { service_type: 'etc', label: '기타' },
];

const state = {
  carwashes: [],
  summary: null,
  regions: { sido: [], sigungu: [], dong: [] },
};

const els = {
  adminSummary: document.querySelector('#adminSummary'),
  adminRegionStats: document.querySelector('#adminRegionStats'),
  adminSearch: document.querySelector('#adminSearch'),
  carwashTable: document.querySelector('#carwashTable'),
  carwashForm: document.querySelector('#carwashForm'),
  carwashFormState: document.querySelector('#carwashFormState'),
  newCarwashButton: document.querySelector('#newCarwashButton'),
  priceForm: document.querySelector('#priceForm'),
  priceFormState: document.querySelector('#priceFormState'),
  priceResetButton: document.querySelector('#priceResetButton'),
  pricePreview: document.querySelector('#pricePreview'),
  serviceForm: document.querySelector('#serviceForm'),
  serviceFormState: document.querySelector('#serviceFormState'),
  serviceRows: document.querySelector('#serviceRows'),
};

let selectedCarwashId = null;
let selectedCarwash = null;
let searchTerm = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function jsonMoney(value) {
  return formatMoney(Number(value || 0));
}

function activePrice(carwash) {
  return carwash.activePrice || null;
}

function computeFiveMinute(carwash) {
  return activePrice(carwash) ? calculateUsePrice(activePrice(carwash), 300) : null;
}

function populateServiceRows(values = []) {
  const byType = new Map(values.map((item) => [item.service_type, item]));
  els.serviceRows.replaceChildren(
    ...serviceTypes.map((service) => {
      const row = document.createElement('div');
      row.className = 'wp-service-row';
      row.innerHTML = `
        <div class="wp-service-type">${escapeHtml(service.label)}</div>
        <label><span>가격</span><input data-service-field="price" data-service-type="${escapeHtml(service.service_type)}" type="number" min="0" step="1" /></label>
        <label><span>시간(초)</span><input data-service-field="seconds" data-service-type="${escapeHtml(service.service_type)}" type="number" min="0" step="1" /></label>
        <label><span>메모</span><input data-service-field="memo" data-service-type="${escapeHtml(service.service_type)}" type="text" maxlength="80" /></label>
      `;
      const existing = byType.get(service.service_type);
      if (existing) {
        row.querySelector('[data-service-field="price"]').value = existing.price ?? '';
        row.querySelector('[data-service-field="seconds"]').value = existing.seconds ?? '';
        row.querySelector('[data-service-field="memo"]').value = existing.memo ?? '';
      }
      return row;
    }),
  );
}

function renderDashboard() {
  const summary = state.summary || { totalCarwashes: 0, priceRegistered: 0, priceUnregistered: 0, recent30Count: 0, regionCounts: {} };
  els.adminSummary.replaceChildren(
    ...[
      ['전체 세차장 수', `${summary.totalCarwashes}곳`],
      ['가격 등록 완료 수', `${summary.priceRegistered}곳`],
      ['가격 미등록 수', `${summary.priceUnregistered}곳`],
      ['최근 30일 확인 수', `${summary.recent30Count}건`],
    ].map(([label, value]) => {
      const card = document.createElement('article');
      card.className = 'wp-summary-card';
      card.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>WashPrice</small>`;
      return card;
    }),
  );

  els.adminRegionStats.replaceChildren(
    ...Object.entries(summary.regionCounts || {})
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
      .map(([region, count]) => {
        const card = document.createElement('article');
        card.className = 'wp-region-stat';
        card.innerHTML = `<strong>${escapeHtml(region)}</strong><small>${escapeHtml(`${count}곳 등록`)}</small>`;
        return card;
      }),
  );
}

function filteredCarwashes() {
  const query = searchTerm.trim().toLowerCase();
  return [...state.carwashes].filter((carwash) => {
    if (!query) return true;
    const price = activePrice(carwash);
    const haystack = [
      carwash.name,
      carwash.address,
      carwash.sido,
      carwash.sigungu,
      carwash.dong,
      price ? String(price.base_price) : '',
      price ? String(price.verified_at) : '',
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function renderTable() {
  const rows = filteredCarwashes();
  els.carwashTable.replaceChildren(
    ...rows.map((carwash) => {
      const price = activePrice(carwash);
      const row = document.createElement('article');
      row.className = 'wp-admin-row';
      if (selectedCarwashId === carwash.id) row.classList.add('is-active');
      row.dataset.carwashId = String(carwash.id);
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(carwash.name)}</strong>
          <small>${escapeHtml(`${carwash.sido} ${carwash.sigungu} ${carwash.dong}`)}</small>
          <small>${escapeHtml(price ? `${jsonMoney(price.base_price)} / ${formatDuration(price.base_seconds)} · 최근 ${price.verified_at}` : '가격 미등록')}</small>
        </div>
        <div class="wp-admin-row-actions">
          <button class="wp-inline-button" type="button" data-action="edit">수정</button>
          <button class="wp-inline-button danger" type="button" data-action="delete">삭제</button>
        </div>
      `;
      row.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'edit') {
          selectCarwash(carwash.id);
          return;
        }
        if (action === 'delete') {
          deleteCarwash(carwash.id);
          return;
        }
        selectCarwash(carwash.id);
      });
      return row;
    }),
  );
}

function renderForms(carwash) {
  const form = els.carwashForm;
  if (!carwash) {
    form.reset();
    form.elements.id.value = '';
    els.carwashFormState.textContent = '새 세차장을 등록하세요.';
    els.priceFormState.textContent = '세차장을 먼저 선택하세요.';
    els.serviceFormState.textContent = '세차장을 먼저 선택하세요.';
    els.pricePreview.innerHTML = '<div class="wp-detail-empty">가격 미리보기 없음</div>';
    populateServiceRows([]);
    return;
  }
  form.elements.id.value = carwash.id;
  form.elements.name.value = carwash.name || '';
  form.elements.address.value = carwash.address || '';
  form.elements.sido.value = carwash.sido || '';
  form.elements.sigungu.value = carwash.sigungu || '';
  form.elements.dong.value = carwash.dong || '';
  form.elements.phone.value = carwash.phone || '';
  form.elements.latitude.value = carwash.latitude || '';
  form.elements.longitude.value = carwash.longitude || '';
  form.elements.open_24h.checked = Boolean(carwash.open_24h);
  form.elements.card_available.checked = Boolean(carwash.card_available);
  els.carwashFormState.textContent = `선택됨: ${carwash.name}`;
  const price = activePrice(carwash);
  if (price) {
    fillPriceForm(price);
    els.priceFormState.textContent = `현재 가격: ${jsonMoney(price.base_price)} / ${formatDuration(price.base_seconds)}`;
  } else {
    formPriceReset();
    els.priceFormState.textContent = '이 세차장에는 등록된 가격이 없습니다.';
  }
  populateServiceRows(carwash.servicePrices || []);
  renderPricePreview();
}

function fillPriceForm(price) {
  const form = els.priceForm;
  form.elements.base_price.value = price.base_price ?? '';
  form.elements.base_seconds.value = price.base_seconds ?? '';
  form.elements.extra_price.value = price.extra_price ?? '';
  form.elements.extra_seconds.value = price.extra_seconds ?? '';
  form.elements.verified_at.value = price.verified_at || '';
  form.elements.source.value = price.source || '';
}

function formPriceReset() {
  els.priceForm.reset();
  els.priceForm.elements.verified_at.value = new Date().toISOString().slice(0, 10);
  els.priceForm.elements.base_price.value = '';
  els.priceForm.elements.base_seconds.value = '';
  els.priceForm.elements.extra_price.value = '';
  els.priceForm.elements.extra_seconds.value = '';
  els.priceForm.elements.source.value = '';
}

function readCarwashPayload() {
  const form = els.carwashForm;
  return {
    name: form.elements.name.value.trim(),
    address: form.elements.address.value.trim(),
    sido: form.elements.sido.value.trim(),
    sigungu: form.elements.sigungu.value.trim(),
    dong: form.elements.dong.value.trim(),
    phone: form.elements.phone.value.trim(),
    latitude: form.elements.latitude.value,
    longitude: form.elements.longitude.value,
    open_24h: form.elements.open_24h.checked,
    card_available: form.elements.card_available.checked,
  };
}

function readPricePayload() {
  const form = els.priceForm;
  return {
    base_price: Number(form.elements.base_price.value || 0),
    base_seconds: Number(form.elements.base_seconds.value || 0),
    extra_price: Number(form.elements.extra_price.value || 0),
    extra_seconds: Number(form.elements.extra_seconds.value || 0),
    verified_at: form.elements.verified_at.value,
    source: form.elements.source.value.trim(),
  };
}

function readServicePayload() {
  const fields = [...els.serviceRows.querySelectorAll('[data-service-type]')];
  const grouped = new Map();
  fields.forEach((input) => {
    const type = input.dataset.serviceType;
    const field = input.dataset.serviceField;
    const current = grouped.get(type) || { service_type: type, price: '', seconds: '', memo: '' };
    current[field] = input.value;
    grouped.set(type, current);
  });
  return [...grouped.values()]
    .filter((item) => item.price || item.seconds || item.memo)
    .map((item) => ({
      service_type: item.service_type,
      price: Number(item.price || 0),
      seconds: Number(item.seconds || 0),
      memo: item.memo.trim(),
    }));
}

function renderPricePreview() {
  const payload = readPricePayload();
  if (!payload.base_price || !payload.base_seconds) {
    els.pricePreview.innerHTML = '<div class="wp-detail-empty">가격을 입력하면 분당 환산과 5분/10분 가격을 계산합니다.</div>';
    return;
  }
  const metrics = calculatePriceMetrics(payload);
  const five = calculateUsePrice(payload, 300);
  const ten = calculateUsePrice(payload, 600);
  els.pricePreview.innerHTML = `
    <div class="wp-preview-card"><span>기본가격</span><strong>${escapeHtml(jsonMoney(payload.base_price))}</strong></div>
    <div class="wp-preview-card"><span>분당 환산</span><strong>${escapeHtml(jsonMoney(metrics.perMinutePrice))}</strong></div>
    <div class="wp-preview-card"><span>5분 예상</span><strong>${escapeHtml(jsonMoney(five?.totalPrice || 0))}</strong></div>
    <div class="wp-preview-card"><span>10분 예상</span><strong>${escapeHtml(jsonMoney(ten?.totalPrice || 0))}</strong></div>
  `;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

async function refreshState() {
  const payload = await api('/api/washprice/state');
  state.carwashes = payload.state.carwashes || [];
  state.summary = payload.state.summary || null;
  state.regions = payload.state.regions || { sido: [], sigungu: [], dong: [] };
  if (!selectedCarwashId && state.carwashes[0]) selectedCarwashId = state.carwashes[0].id;
  selectedCarwash = state.carwashes.find((carwash) => carwash.id === selectedCarwashId) || state.carwashes[0] || null;
}

function selectCarwash(id) {
  selectedCarwashId = Number(id);
  selectedCarwash = state.carwashes.find((carwash) => carwash.id === selectedCarwashId) || null;
  renderTable();
  renderForms(selectedCarwash);
}

async function saveCarwash(event) {
  event.preventDefault();
  const payload = readCarwashPayload();
  const id = Number(els.carwashForm.elements.id.value || 0);
  const method = id ? 'PUT' : 'POST';
  const path = id ? `/api/washprice/carwashes/${id}` : '/api/washprice/carwashes';
  const response = await api(path, { method, body: JSON.stringify(payload) });
  await refreshState();
  selectedCarwashId = response.carwash.id;
  selectedCarwash = state.carwashes.find((carwash) => carwash.id === selectedCarwashId) || null;
  renderDashboard();
  renderTable();
  renderForms(selectedCarwash);
  els.carwashFormState.textContent = id ? '세차장 정보를 수정했습니다.' : '세차장을 저장했습니다. 이제 가격을 등록하세요.';
  document.querySelector('#priceForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function savePrice(event) {
  event.preventDefault();
  if (!selectedCarwashId) throw new Error('세차장을 먼저 선택하세요.');
  const response = await api(`/api/washprice/carwashes/${selectedCarwashId}/prices`, {
    method: 'POST',
    body: JSON.stringify(readPricePayload()),
  });
  await refreshState();
  selectedCarwash = state.carwashes.find((carwash) => carwash.id === selectedCarwashId) || null;
  renderDashboard();
  renderTable();
  renderForms(selectedCarwash);
  els.priceFormState.textContent = response.price?.id ? '가격을 저장했습니다.' : '가격을 반영했습니다.';
}

async function saveServices(event) {
  event.preventDefault();
  if (!selectedCarwashId) throw new Error('세차장을 먼저 선택하세요.');
  await api(`/api/washprice/carwashes/${selectedCarwashId}/services`, {
    method: 'PUT',
    body: JSON.stringify({ services: readServicePayload() }),
  });
  await refreshState();
  selectedCarwash = state.carwashes.find((carwash) => carwash.id === selectedCarwashId) || null;
  renderDashboard();
  renderTable();
  renderForms(selectedCarwash);
  els.serviceFormState.textContent = '부가서비스 가격을 저장했습니다.';
}

async function deleteCarwash(id) {
  if (!confirm('이 세차장을 삭제할까요? 관련 가격과 이력도 함께 지웁니다.')) return;
  await api(`/api/washprice/carwashes/${id}`, { method: 'DELETE' });
  await refreshState();
  selectedCarwashId = state.carwashes[0]?.id || null;
  selectedCarwash = state.carwashes.find((carwash) => carwash.id === selectedCarwashId) || null;
  renderDashboard();
  renderTable();
  renderForms(selectedCarwash);
}

function bindEvents() {
  els.adminSearch.addEventListener('input', () => {
    searchTerm = els.adminSearch.value;
    renderTable();
  });
  els.carwashForm.addEventListener('submit', saveCarwash);
  els.priceForm.addEventListener('submit', savePrice);
  els.serviceForm.addEventListener('submit', saveServices);
  els.newCarwashButton.addEventListener('click', () => {
    selectedCarwashId = null;
    selectedCarwash = null;
    els.carwashForm.reset();
    els.carwashForm.elements.id.value = '';
    els.carwashFormState.textContent = '새 세차장을 등록하세요.';
    formPriceReset();
    populateServiceRows([]);
    renderTable();
  });
  els.priceResetButton.addEventListener('click', () => {
    if (!selectedCarwash) return;
    const price = activePrice(selectedCarwash);
    if (price) {
      fillPriceForm(price);
      els.priceFormState.textContent = `현재 가격: ${jsonMoney(price.base_price)} / ${formatDuration(price.base_seconds)}`;
    }
    renderPricePreview();
  });
  els.priceForm.addEventListener('input', renderPricePreview);
}

async function initialize() {
  bindEvents();
  populateServiceRows([]);
  formPriceReset();
  try {
    await refreshState();
    renderDashboard();
    renderTable();
    renderForms(selectedCarwash);
    renderPricePreview();
  } catch (error) {
    console.error(error);
    els.adminSummary.innerHTML = '<div class="wp-detail-empty">관리자 데이터를 불러오지 못했습니다.</div>';
    els.carwashTable.innerHTML = '<div class="wp-detail-empty">세차장 목록을 불러오지 못했습니다.</div>';
  }
}

initialize();

