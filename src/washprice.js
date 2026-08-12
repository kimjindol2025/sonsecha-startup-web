import { calculateUsePrice, formatDuration, formatMoney } from './washprice-math.js';

const state = {
  carwashes: [],
  summary: null,
  regions: { sido: [], sigungu: [], dong: [] },
};

const filters = {
  sido: '',
  sigungu: '',
  dong: '',
  query: '',
};

let sortMode = 'base_price';
let selectedCarwashId = null;

const els = {
  heroBasePrice: document.querySelector('#heroBasePrice'),
  heroBaseTime: document.querySelector('#heroBaseTime'),
  heroFiveMinute: document.querySelector('#heroFiveMinute'),
  heroTenMinute: document.querySelector('#heroTenMinute'),
  sidoSelect: document.querySelector('#sidoSelect'),
  sigunguSelect: document.querySelector('#sigunguSelect'),
  dongSelect: document.querySelector('#dongSelect'),
  queryInput: document.querySelector('#queryInput'),
  searchButton: document.querySelector('#searchButton'),
  resetButton: document.querySelector('#resetButton'),
  homeSummary: document.querySelector('#homeSummary'),
  regionSummary: document.querySelector('#regionSummary'),
  recentUpdates: document.querySelector('#recentUpdates'),
  carwashList: document.querySelector('#carwashList'),
  detailView: document.querySelector('#detailView'),
  regionTitle: document.querySelector('#regionTitle'),
  sortButtons: [...document.querySelectorAll('[data-sort]')],
};

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

function setOptions(select, values, placeholder) {
  const items = [''];
  select.replaceChildren(
    ...items.concat(values).map((value, index) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = index === 0 ? placeholder : value;
      return option;
    }),
  );
}

function selectedLabel() {
  const parts = [filters.sido, filters.sigungu, filters.dong].filter(Boolean);
  return parts.length ? parts.join(' > ') : '전체';
}

function activePrice(carwash) {
  return carwash.activePrice || null;
}

function computeFiveMinute(carwash) {
  return activePrice(carwash) ? calculateUsePrice(activePrice(carwash), 300) : null;
}

function computeTenMinute(carwash) {
  return activePrice(carwash) ? calculateUsePrice(activePrice(carwash), 600) : null;
}

function formatBaseLabel(carwash) {
  const price = activePrice(carwash);
  if (!price) return '미등록';
  return `${jsonMoney(price.base_price)} / ${formatDuration(price.base_seconds)}`;
}

function formatFiveMinuteLabel(carwash) {
  const price = computeFiveMinute(carwash);
  return price ? jsonMoney(price.totalPrice) : '미등록';
}

function verifyLabel(carwash) {
  return carwash.activePrice?.verified_at || '미등록';
}

function updateHeroMetrics(carwashes) {
  const focus = carwashes[0] || state.carwashes[0];
  const price = activePrice(focus);
  const five = computeFiveMinute(focus);
  const ten = computeTenMinute(focus);
  els.heroBasePrice.textContent = price ? jsonMoney(price.base_price) : '-';
  els.heroBaseTime.textContent = price ? formatDuration(price.base_seconds) : '-';
  els.heroFiveMinute.textContent = five ? jsonMoney(five.totalPrice) : '-';
  els.heroTenMinute.textContent = ten ? jsonMoney(ten.totalPrice) : '-';
}

function filteredCarwashes() {
  const query = filters.query.trim().toLowerCase();
  return state.carwashes.filter((carwash) => {
    if (filters.sido && carwash.sido !== filters.sido) return false;
    if (filters.sigungu && carwash.sigungu !== filters.sigungu) return false;
    if (filters.dong && carwash.dong !== filters.dong) return false;
    if (!query) return true;
    const price = activePrice(carwash);
    const haystack = [
      carwash.name,
      carwash.address,
      carwash.sido,
      carwash.sigungu,
      carwash.dong,
      price ? String(price.base_price) : '',
      price ? String(price.extra_price) : '',
      price ? price.verified_at : '',
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

function sortedCarwashes(list) {
  const items = [...list];
  items.sort((a, b) => {
    const ap = activePrice(a);
    const bp = activePrice(b);
    const af = computeFiveMinute(a);
    const bf = computeFiveMinute(b);
    switch (sortMode) {
      case 'five_minute':
        return (af?.totalPrice || 9e15) - (bf?.totalPrice || 9e15) || a.name.localeCompare(b.name, 'ko');
      case 'recent':
        return (bp?.verified_at || '').localeCompare(ap?.verified_at || '') || (b.updated_at || '').localeCompare(a.updated_at || '');
      case 'name':
        return a.name.localeCompare(b.name, 'ko');
      case 'base_price':
      default:
        return (ap?.base_price || 9e15) - (bp?.base_price || 9e15) || a.name.localeCompare(b.name, 'ko');
    }
  });
  return items;
}

function summaryStats(list) {
  const registered = list.filter((carwash) => activePrice(carwash));
  const basePrices = registered.map((carwash) => Number(activePrice(carwash).base_price || 0));
  const fivePrices = registered.map((carwash) => Number(computeFiveMinute(carwash)?.totalPrice || 0));
  const average = (values) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);
  return {
    count: list.length,
    averageBase: average(basePrices),
    minimumBase: basePrices.length ? Math.min(...basePrices) : 0,
    averageFive: average(fivePrices),
  };
}

function renderSummary(container, stats, label) {
  container.replaceChildren(
    ...[
      { label: '등록 세차장 수', value: `${stats.count}곳` },
      { label: '평균 기본요금', value: stats.averageBase ? jsonMoney(stats.averageBase) : '미등록' },
      { label: '최저 기본요금', value: stats.minimumBase ? jsonMoney(stats.minimumBase) : '미등록' },
      { label: '평균 5분 환산가격', value: stats.averageFive ? jsonMoney(stats.averageFive) : '미등록' },
    ].map((item) => {
      const card = document.createElement('article');
      card.className = 'wp-summary-card';
      card.innerHTML = `<span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong><small>${escapeHtml(label)}</small>`;
      return card;
    }),
  );
}

function renderRecentUpdates() {
  const recent = [...state.carwashes]
    .sort((a, b) => (b.activePrice?.verified_at || '').localeCompare(a.activePrice?.verified_at || '') || (b.updated_at || '').localeCompare(a.updated_at || ''))
    .slice(0, 5);
  els.recentUpdates.replaceChildren(
    ...recent.map((carwash) => {
      const price = activePrice(carwash);
      const card = document.createElement('article');
      card.className = 'wp-recent-item';
      card.innerHTML = `
        <strong>${escapeHtml(carwash.name)}</strong>
        <small>${escapeHtml(carwash.sigungu)} · ${escapeHtml(carwash.dong)}</small>
        <span>${escapeHtml(formatBaseLabel(carwash))}</span>
        <em>${escapeHtml(price ? `최근 확인일 ${price.verified_at}` : '가격 미등록')}</em>
      `;
      card.addEventListener('click', () => selectCarwash(carwash.id));
      return card;
    }),
  );
}

function renderList() {
  const list = sortedCarwashes(filteredCarwashes());
  const stats = summaryStats(list);
  renderSummary(els.homeSummary, stats, selectedLabel());
  renderSummary(els.regionSummary, stats, selectedLabel());
  els.regionTitle.textContent = selectedLabel();
  updateHeroMetrics(list);

  if (!list.length) {
    els.carwashList.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'wp-detail-empty',
      textContent: '조건에 맞는 세차장이 없습니다.',
    }));
    if (!selectedCarwashId) els.detailView.innerHTML = '<div class="wp-detail-empty">세차장을 선택하세요.</div>';
    return;
  }

  els.carwashList.replaceChildren(
    ...list.map((carwash) => {
      const price = activePrice(carwash);
      const five = computeFiveMinute(carwash);
      const item = document.createElement('article');
      item.className = 'wp-list-item';
      item.dataset.carwashId = String(carwash.id);
      item.setAttribute('role', 'button');
      item.tabIndex = 0;
      item.innerHTML = `
        <div>
          <strong>${escapeHtml(carwash.name)}</strong>
          <div class="wp-muted">${escapeHtml(carwash.address)}</div>
          <div class="wp-chip-row">
            <span class="wp-chip">${escapeHtml(carwash.open_24h ? '24시간' : '운영중')}</span>
            <span class="wp-chip">${escapeHtml(carwash.card_available ? '카드 가능' : '현금 위주')}</span>
            <span class="wp-chip">${escapeHtml(carwash.sigungu)}</span>
          </div>
        </div>
        <div class="wp-list-price">
          <strong>${escapeHtml(formatBaseLabel(carwash))}</strong>
          <span>${escapeHtml(five ? `5분 환산 ${jsonMoney(five.totalPrice)}` : '5분 환산 미등록')}</span>
          <small class="wp-muted">${escapeHtml(price ? `최근 확인 ${price.verified_at}` : '가격 미등록')}</small>
        </div>
      `;
      if (Number(selectedCarwashId) === carwash.id) item.classList.add('is-active');
      item.addEventListener('click', () => selectCarwash(carwash.id, true));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectCarwash(carwash.id, true);
        }
      });
      return item;
    }),
  );

  renderDetail(list.find((carwash) => carwash.id === Number(selectedCarwashId)) || list[0]);
  renderRecentUpdates();
}

function renderDetail(carwash) {
  if (!carwash) {
    els.detailView.innerHTML = '<div class="wp-detail-empty">세차장을 선택하세요.</div>';
    return;
  }
  selectedCarwashId = carwash.id;
  const price = activePrice(carwash);
  const five = computeFiveMinute(carwash);
  const ten = computeTenMinute(carwash);
  const metrics = [
    ['기본요금', price ? jsonMoney(price.base_price) : '미등록'],
    ['기본시간', price ? formatDuration(price.base_seconds) : '미등록'],
    ['추가요금', price ? jsonMoney(price.extra_price) : '미등록'],
    ['추가시간', price ? formatDuration(price.extra_seconds) : '미등록'],
    ['분당 환산가격', price ? jsonMoney(Math.ceil(price.base_price * 60 / price.base_seconds)) : '미등록'],
    ['5분 환산가격', five ? jsonMoney(five.totalPrice) : '미등록'],
    ['10분 환산가격', ten ? jsonMoney(ten.totalPrice) : '미등록'],
    ['최근 확인일', price ? price.verified_at : '미등록'],
  ];
  const servicePrices = carwash.servicePrices.filter((item) => item.price || item.seconds || item.memo);
  const priceHistory = carwash.priceHistory;
  els.detailView.innerHTML = `
    <article class="wp-detail-card">
      <div class="wp-detail-grid">
        ${metrics.map(([label, value]) => `<div class="wp-detail-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}
      </div>
    </article>
    <article class="wp-detail-card">
      <div class="wp-detail-section">
        <p class="wp-kicker">BASIC INFO</p>
        <h3>${escapeHtml(carwash.name)}</h3>
        <div class="wp-detail-meta">${escapeHtml(carwash.address)}</div>
        <div class="wp-chip-row">
          <span class="wp-chip">${escapeHtml(carwash.sido)}</span>
          <span class="wp-chip">${escapeHtml(carwash.sigungu)}</span>
          <span class="wp-chip">${escapeHtml(carwash.dong)}</span>
          <span class="wp-chip">${escapeHtml(carwash.open_24h ? '24시간' : '운영중')}</span>
          <span class="wp-chip">${escapeHtml(carwash.card_available ? '카드 가능' : '카드 미확인')}</span>
        </div>
      </div>
    </article>
    <article class="wp-detail-card">
      <div class="wp-detail-section">
        <p class="wp-kicker">SERVICE PRICE</p>
        <h3>부가서비스</h3>
        ${servicePrices.length ? `
          <div class="wp-service-list">
            ${servicePrices.map((service) => `
              <div class="wp-history-item">
                <strong>${escapeHtml(serviceLabel(service.service_type))} · ${escapeHtml(jsonMoney(service.price))}</strong>
                <small>${escapeHtml(service.seconds ? `${formatDuration(service.seconds)} 기준` : '시간 정보 없음')}${service.memo ? ` · ${escapeHtml(service.memo)}` : ''}</small>
              </div>
            `).join('')}
          </div>
        ` : '<div class="wp-detail-empty">등록된 부가서비스가 없습니다.</div>'}
      </div>
    </article>
    <article class="wp-detail-card">
      <div class="wp-detail-section">
        <p class="wp-kicker">PRICE HISTORY</p>
        <h3>가격이력</h3>
        ${priceHistory.length ? `
          <div class="wp-price-history">
            ${priceHistory.map((history) => `
              <div class="wp-history-item">
                <strong>${escapeHtml(jsonMoney(history.base_price))} / ${escapeHtml(formatDuration(history.base_seconds))}</strong>
                <small>${escapeHtml(history.verified_at)} · 추가 ${escapeHtml(jsonMoney(history.extra_price))} / ${escapeHtml(formatDuration(history.extra_seconds))}</small>
              </div>
            `).join('')}
          </div>
        ` : '<div class="wp-detail-empty">가격 이력이 없습니다.</div>'}
      </div>
    </article>
  `;
}

function serviceLabel(type) {
  return {
    vacuum: '진공청소기',
    foam: '폼건',
    underbody: '하부세차',
    mat: '매트세척기',
    air: '에어건',
    etc: '기타',
  }[type] || type;
}

function selectCarwash(id, scroll = false) {
  selectedCarwashId = Number(id);
  renderList();
  if (scroll) document.querySelector('#detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function populateFilters() {
  setOptions(els.sidoSelect, state.regions.sido, '전체');
  setOptions(els.sigunguSelect, state.regions.sigungu, '전체');
  setOptions(els.dongSelect, state.regions.dong, '전체');
}

function syncFiltersFromForm() {
  filters.sido = els.sidoSelect.value;
  filters.sigungu = els.sigunguSelect.value;
  filters.dong = els.dongSelect.value;
  filters.query = els.queryInput.value.trim();
}

function bindEvents() {
  els.searchButton.addEventListener('click', () => {
    syncFiltersFromForm();
    renderList();
  });
  els.resetButton.addEventListener('click', () => {
    filters.sido = '';
    filters.sigungu = '';
    filters.dong = '';
    filters.query = '';
    els.sidoSelect.value = '';
    els.sigunguSelect.value = '';
    els.dongSelect.value = '';
    els.queryInput.value = '';
    renderList();
  });
  [els.sidoSelect, els.sigunguSelect, els.dongSelect].forEach((select) => {
    select.addEventListener('change', () => {
      syncFiltersFromForm();
      renderList();
    });
  });
  els.queryInput.addEventListener('input', () => {
    syncFiltersFromForm();
    renderList();
  });
  els.sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      sortMode = button.dataset.sort;
      els.sortButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      renderList();
    });
  });
}

async function loadWashPriceState() {
  const response = await fetch('/api/washprice/state', { cache: 'no-store' });
  if (!response.ok) throw new Error(`washprice state ${response.status}`);
  const payload = await response.json();
  if (!payload.state) throw new Error('washprice state missing');
  state.carwashes = payload.state.carwashes || [];
  state.summary = payload.state.summary || null;
  state.regions = payload.state.regions || { sido: [], sigungu: [], dong: [] };
}

async function initialize() {
  bindEvents();
  try {
    await loadWashPriceState();
    populateFilters();
    renderList();
  } catch (error) {
    console.error(error);
    els.homeSummary.innerHTML = '<div class="wp-detail-empty">세차장 데이터를 불러오지 못했습니다.</div>';
    els.regionSummary.innerHTML = '<div class="wp-detail-empty">데이터를 확인할 수 없습니다.</div>';
    els.detailView.innerHTML = '<div class="wp-detail-empty">상세 정보를 불러오지 못했습니다.</div>';
  }
}

initialize();

