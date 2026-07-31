const categoryLabels = {
  chemical: '세차 케미컬',
  tool: '세차 도구',
  equipment: '장비·부품',
  safety: '안전·관리용품',
};

const elements = {
  loginView: document.querySelector('#loginView'),
  loginForm: document.querySelector('#loginForm'),
  password: document.querySelector('#adminPassword'),
  loginFeedback: document.querySelector('#loginFeedback'),
  dashboard: document.querySelector('#dashboard'),
  sectionTabs: document.querySelectorAll('[data-admin-section]'),
  contentPanel: document.querySelector('#contentPanel'),
  productPanel: document.querySelector('#productPanel'),
  analyticsPanel: document.querySelector('#analyticsPanel'),
  contentForm: document.querySelector('#contentForm'),
  contentGroups: document.querySelector('#contentFieldGroups'),
  contentFeedback: document.querySelector('#contentFeedback'),
  logout: document.querySelector('#logoutButton'),
  newProduct: document.querySelector('#newProductButton'),
  search: document.querySelector('#adminProductSearch'),
  list: document.querySelector('#adminProductList'),
  count: document.querySelector('#adminProductCount'),
  activeCount: document.querySelector('#adminActiveCount'),
  soldOutCount: document.querySelector('#adminSoldOutCount'),
  analyticsRange: document.querySelector('#analyticsRange'),
  analyticsRefresh: document.querySelector('#analyticsRefresh'),
  analyticsSearch: document.querySelector('#analyticsSearch'),
  analyticsToday: document.querySelector('#analyticsToday'),
  analyticsWeek: document.querySelector('#analyticsWeek'),
  analyticsMonth: document.querySelector('#analyticsMonth'),
  analyticsLifetime: document.querySelector('#analyticsLifetime'),
  analyticsPeriodTotal: document.querySelector('#analyticsPeriodTotal'),
  analyticsChart: document.querySelector('#analyticsChart'),
  analyticsDevices: document.querySelector('#analyticsDevices'),
  analyticsEvents: document.querySelector('#analyticsEvents'),
  analyticsEmpty: document.querySelector('#analyticsEmpty'),
  analyticsFeedback: document.querySelector('#analyticsFeedback'),
  form: document.querySelector('#productForm'),
  formButton: document.querySelector('#saveProductButton'),
  mode: document.querySelector('#editorMode'),
  title: document.querySelector('#editorTitle'),
  productId: document.querySelector('#editorProductId'),
  imagePreview: document.querySelector('#editorImagePreview'),
  feedback: document.querySelector('#productFeedback'),
  passwordForm: document.querySelector('#passwordForm'),
};

let products = [];
let selectedId = '';
let contentFields = [];
let analytics = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      'x-admin-request': '1',
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function showLogin(message = '') {
  elements.dashboard.hidden = true;
  elements.loginView.hidden = false;
  elements.loginFeedback.textContent = message;
  elements.password.value = '';
  requestAnimationFrame(() => elements.password.focus());
}

async function showDashboard() {
  elements.loginView.hidden = true;
  elements.dashboard.hidden = false;
  await Promise.all([loadContent(), loadProducts(), loadAnalytics()]);
  switchAdminSection('content');
}

function switchAdminSection(section) {
  elements.contentPanel.hidden = section !== 'content';
  elements.productPanel.hidden = section !== 'products';
  elements.analyticsPanel.hidden = section !== 'analytics';
  elements.newProduct.hidden = section !== 'products';
  elements.sectionTabs.forEach((button) => {
    const active = button.dataset.adminSection === section;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('ko-KR');
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function formatDay(value) {
  const [, month, day] = String(value).split('-');
  return `${Number(month)}/${Number(day)}`;
}

const analyticsKindLabels = {
  banner: '배너',
  cart: '장바구니',
  check: '체크',
  control: '버튼',
  custom: '기타',
  details: '상세',
  field: '입력칸',
  filter: '필터',
  link: '링크',
  phone: '전화',
  product: '상품',
  select: '선택',
};

function visibleAnalyticsEvents() {
  const query = elements.analyticsSearch.value.trim().toLocaleLowerCase('ko-KR');
  const events = Array.isArray(analytics?.events) ? analytics.events : [];
  return events.filter((item) => !query
    || `${item.label} ${item.section} ${analyticsKindLabels[item.kind] || item.kind}`.toLocaleLowerCase('ko-KR').includes(query));
}

function renderAnalyticsEvents() {
  const events = visibleAnalyticsEvents();
  elements.analyticsEvents.innerHTML = events.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.label)}</strong>${item.href ? `<small>${escapeHtml(item.href)}</small>` : ''}</td>
      <td>${escapeHtml(item.section)}</td>
      <td><span class="analytics-kind">${escapeHtml(analyticsKindLabels[item.kind] || item.kind)}</span></td>
      <td><b>${formatNumber(item.period)}</b></td>
      <td>${formatNumber(item.total)}</td>
      <td>${escapeHtml(formatDateTime(item.lastClickedAt))}</td>
    </tr>
  `).join('');
  elements.analyticsEmpty.hidden = events.length > 0;
}

function renderAnalytics() {
  const totals = analytics?.totals || {};
  elements.analyticsToday.textContent = formatNumber(totals.today);
  elements.analyticsWeek.textContent = formatNumber(totals.last7);
  elements.analyticsMonth.textContent = formatNumber(totals.last30);
  elements.analyticsLifetime.textContent = formatNumber(totals.lifetime);
  elements.analyticsPeriodTotal.textContent = `${formatNumber(totals.period)}회`;

  const days = Array.isArray(analytics?.days) ? analytics.days : [];
  const maximum = Math.max(1, ...days.map((day) => Number(day.total || 0)));
  elements.analyticsChart.innerHTML = days.map((day) => `
    <div class="chart-column" title="${escapeHtml(day.date)} · ${formatNumber(day.total)}회">
      <strong>${formatNumber(day.total)}</strong>
      <span><i style="height:${Math.max(4, Math.round((Number(day.total || 0) / maximum) * 100))}%"></i></span>
      <small>${escapeHtml(formatDay(day.date))}</small>
    </div>
  `).join('');
  requestAnimationFrame(() => { elements.analyticsChart.scrollLeft = elements.analyticsChart.scrollWidth; });

  const devices = analytics?.devices || {};
  const deviceItems = [
    ['mobile', '모바일'], ['tablet', '태블릿'], ['desktop', 'PC'], ['unknown', '기타'],
  ];
  const deviceTotal = Math.max(1, deviceItems.reduce((sum, [key]) => sum + Number(devices[key] || 0), 0));
  elements.analyticsDevices.innerHTML = deviceItems.map(([key, label]) => {
    const value = Number(devices[key] || 0);
    const percentage = Math.round((value / deviceTotal) * 100);
    return `<div><p><span>${label}</span><strong>${formatNumber(value)} · ${percentage}%</strong></p><i><b style="width:${percentage}%"></b></i></div>`;
  }).join('');
  renderAnalyticsEvents();
}

async function loadAnalytics() {
  elements.analyticsRefresh.disabled = true;
  elements.analyticsFeedback.textContent = '집계 불러오는 중…';
  try {
    const payload = await api(`/api/admin/analytics?range=${encodeURIComponent(elements.analyticsRange.value)}`);
    analytics = payload.analytics || null;
    renderAnalytics();
    elements.analyticsFeedback.textContent = analytics?.updatedAt
      ? `최근 집계 ${formatDateTime(analytics.updatedAt)}`
      : '아직 집계된 클릭이 없습니다.';
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.analyticsFeedback.textContent = error.message;
  } finally {
    elements.analyticsRefresh.disabled = false;
  }
}

function renderContentFields(content) {
  const groups = new Map();
  contentFields.forEach((field) => {
    if (!groups.has(field.group)) groups.set(field.group, []);
    groups.get(field.group).push(field);
  });
  elements.contentGroups.innerHTML = [...groups.entries()].map(([group, fields], groupIndex) => `
    <details class="content-group"${groupIndex === 0 ? ' open' : ''}>
      <summary>${escapeHtml(group)} · ${fields.length}개</summary>
      <div class="content-fields">
        ${fields.map((field) => `
          <label class="${field.multiline ? 'wide' : ''}">
            <span>${escapeHtml(field.label)}</span>
            ${field.multiline
              ? `<textarea name="${escapeHtml(field.key)}" maxlength="${field.maxLength}" rows="3"></textarea>`
              : `<input name="${escapeHtml(field.key)}" type="text" maxlength="${field.maxLength}">`}
          </label>
        `).join('')}
      </div>
    </details>
  `).join('');
  contentFields.forEach((field) => {
    const control = elements.contentForm.elements[field.key];
    if (control) control.value = typeof content[field.key] === 'string' ? content[field.key] : field.value;
  });
}

async function loadContent() {
  try {
    const payload = await api('/api/admin/content');
    contentFields = Array.isArray(payload.fields) ? payload.fields : [];
    renderContentFields(payload.content || {});
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.contentFeedback.textContent = error.message;
  }
}

function formatPrice(price) {
  return price === null || price === '' ? '가격 문의' : `${Number(price).toLocaleString('ko-KR')}원`;
}

function visibleProducts() {
  const query = elements.search.value.trim().toLocaleLowerCase('ko-KR');
  return products.filter((product) => !query || `${product.name} ${product.summary}`.toLocaleLowerCase('ko-KR').includes(query));
}

function renderList() {
  const visible = visibleProducts();
  elements.count.textContent = String(products.length);
  elements.activeCount.textContent = String(products.filter((product) => product.active !== false).length);
  elements.soldOutCount.textContent = String(products.filter((product) => product.inStock === false).length);
  if (!visible.length) {
    elements.list.innerHTML = '<p class="admin-empty">조건에 맞는 상품이 없습니다.</p>';
    return;
  }
  elements.list.innerHTML = visible.map((product) => `
    <button class="admin-product-item${product.id === selectedId ? ' active' : ''}" type="button" data-product-id="${escapeHtml(product.id)}">
      ${product.image
        ? `<img src="${escapeHtml(product.image)}" alt="" loading="lazy">`
        : '<span class="admin-item-placeholder" aria-hidden="true">水</span>'}
      <span class="admin-item-copy">
        <strong>${escapeHtml(product.name)}</strong>
        <small>${escapeHtml(categoryLabels[product.category] || '기타')} · ${escapeHtml(formatPrice(product.price))}</small>
      </span>
      <em class="admin-item-state${product.active === false ? ' off' : ''}">${product.active === false ? '비공개' : product.inStock === false ? '품절' : '공개'}</em>
    </button>
  `).join('');
}

function renderImagePreview(url = '') {
  elements.imagePreview.innerHTML = url
    ? `<img src="${escapeHtml(url)}" alt="상품 이미지 미리보기">`
    : '<span aria-hidden="true">水</span>';
  elements.imagePreview.querySelector('img')?.addEventListener('error', () => {
    elements.imagePreview.innerHTML = '<span aria-hidden="true">水</span>';
  }, { once: true });
}

function fillForm(product) {
  selectedId = product?.id || '';
  elements.form.reset();
  elements.form.elements.name.value = product?.name || '';
  elements.form.elements.category.value = product?.category || 'equipment';
  elements.form.elements.price.value = product?.price ?? '';
  elements.form.elements.summary.value = product?.summary || '';
  elements.form.elements.image.value = product?.image || '';
  elements.form.elements.shopUrl.value = product?.shopUrl || '';
  elements.form.elements.badge.value = product?.badge || '';
  elements.form.elements.featured.value = product?.featured ?? 0;
  elements.form.elements.active.checked = product?.active !== false;
  elements.form.elements.inStock.checked = product?.inStock !== false;
  elements.mode.textContent = product ? 'EDIT PRODUCT' : 'NEW PRODUCT';
  elements.title.textContent = product ? product.name : '새 상품 등록';
  elements.productId.textContent = product ? `ID · ${product.id}` : '필수 항목(*)을 입력해 주세요.';
  elements.formButton.disabled = false;
  elements.formButton.textContent = product ? '수정 내용 저장' : '새 상품 저장';
  elements.feedback.textContent = '';
  renderImagePreview(product?.image);
  renderList();
}

async function loadProducts(preferredId = '') {
  try {
    const payload = await api('/api/admin/products');
    products = Array.isArray(payload.products) ? payload.products : [];
    renderList();
    const nextId = preferredId || selectedId || products[0]?.id;
    const selected = products.find((product) => product.id === nextId);
    if (selected) fillForm(selected);
    else fillForm(null);
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.feedback.textContent = error.message;
  }
}

function formProduct() {
  const fields = elements.form.elements;
  return {
    name: fields.name.value,
    category: fields.category.value,
    price: fields.price.value === '' ? null : Number(fields.price.value),
    summary: fields.summary.value,
    image: fields.image.value,
    shopUrl: fields.shopUrl.value,
    badge: fields.badge.value,
    featured: Number(fields.featured.value || 0),
    active: fields.active.checked,
    inStock: fields.inStock.checked,
  };
}

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  elements.loginFeedback.textContent = '확인 중…';
  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: elements.password.value.trim() }),
    });
    await showDashboard();
  } catch (error) {
    elements.loginFeedback.textContent = error.message;
    elements.password.select();
  }
});

elements.logout.addEventListener('click', async () => {
  try { await api('/api/admin/logout', { method: 'POST' }); } catch { /* session may already be gone */ }
  showLogin('로그아웃했습니다.');
});

elements.sectionTabs.forEach((button) => {
  button.addEventListener('click', () => switchAdminSection(button.dataset.adminSection));
});

elements.analyticsRange.addEventListener('change', loadAnalytics);
elements.analyticsRefresh.addEventListener('click', loadAnalytics);
elements.analyticsSearch.addEventListener('input', renderAnalyticsEvents);

elements.contentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = elements.contentForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  elements.contentFeedback.textContent = '저장 중…';
  const content = Object.fromEntries(contentFields.map((field) => [
    field.key,
    elements.contentForm.elements[field.key]?.value || '',
  ]));
  try {
    const payload = await api('/api/admin/content', {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    renderContentFields(payload.content);
    elements.contentFeedback.textContent = '메인페이지 글을 저장했습니다.';
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.contentFeedback.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

elements.newProduct.addEventListener('click', () => {
  fillForm(null);
  globalThis.scrollTo({ top: elements.form.offsetTop - 90, behavior: 'smooth' });
});

elements.search.addEventListener('input', renderList);
elements.list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-product-id]');
  if (!button) return;
  const product = products.find((item) => item.id === button.dataset.productId);
  if (product) fillForm(product);
});

elements.form.elements.image.addEventListener('input', (event) => renderImagePreview(event.target.value.trim()));
elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  elements.formButton.disabled = true;
  elements.feedback.textContent = '저장 중…';
  try {
    const path = selectedId ? `/api/admin/products/${encodeURIComponent(selectedId)}` : '/api/admin/products';
    const payload = await api(path, {
      method: selectedId ? 'PUT' : 'POST',
      body: JSON.stringify(formProduct()),
    });
    await loadProducts(payload.product.id);
    elements.feedback.textContent = '저장했습니다. 제품몰에 반영됩니다.';
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.feedback.textContent = error.message;
  } finally {
    elements.formButton.disabled = false;
  }
});

elements.passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!globalThis.confirm('비밀번호를 변경하면 현재 세션이 종료됩니다. 변경할까요?')) return;
  try {
    await api('/api/admin/password', {
      method: 'PUT',
      body: JSON.stringify({ password: elements.passwordForm.elements.password.value }),
    });
    elements.passwordForm.reset();
    showLogin('비밀번호를 변경했습니다. 새 비밀번호로 접속하세요.');
  } catch (error) {
    globalThis.alert(error.message);
  }
});

async function initialize() {
  try {
    const session = await api('/api/admin/session');
    if (session.authenticated) await showDashboard();
    else showLogin();
  } catch {
    showLogin('관리자 서버에 연결할 수 없습니다.');
  }
}

initialize();
