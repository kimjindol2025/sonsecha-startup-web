import guideMarkdown from '../README.md?raw';
import { defaultSiteContent } from './content.js';
import { productCategories, products } from './products.js';

const checkboxes = [...document.querySelectorAll('input[data-step]')];
const progressText = document.querySelector('#progressText');
const progressBar = document.querySelector('#progressBar');
const storageKey = 'sonsecha-roadmap-progress';
const detailStorageKey = 'sonsecha-detail-checks-v1';
const detailNotesStorageKey = 'sonsecha-detail-notes-v1';
const legacyCandidateStorageKey = 'sonsecha-candidate-v1';
const candidateStorageKey = 'sonsecha-candidates-v2';
let candidateState;
let currentSiteContent = { ...defaultSiteContent };

function applySiteContent(content) {
  currentSiteContent = { ...defaultSiteContent, ...content };
  document.querySelectorAll('[data-content-key]').forEach((element) => {
    const value = currentSiteContent[element.dataset.contentKey];
    if (typeof value === 'string') element.textContent = value;
  });
  const phoneHref = `tel:${currentSiteContent.phone.replace(/[^0-9+]/g, '')}`;
  document.querySelectorAll('[data-phone-link]').forEach((link) => { link.href = phoneHref; });
  const businessNumber = currentSiteContent.businessNumber.replace(/\D/g, '');
  document.querySelectorAll('[data-business-link]').forEach((link) => {
    link.href = `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${businessNumber}`;
  });
}

async function initializeSiteContent() {
  try {
    const response = await fetch('/api/content', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload.content || typeof payload.content !== 'object') throw new Error('콘텐츠 형식 오류');
    applySiteContent(payload.content);
  } catch (error) {
    console.warn('서버 메인 글을 불러오지 못해 기본 글을 사용합니다.', error);
    applySiteContent(defaultSiteContent);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderInline(value) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a class="source-link" href="$2" target="_blank" rel="noreferrer">$1 ↗</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function renderMarkdown(markdown) {
  const lines = markdown.trim().split('\n');
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }
    if (line === '---') {
      html.push('<hr>');
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 4);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (line.startsWith('> ')) {
      const quote = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quote.push(lines[index].trim().slice(2));
        index += 1;
      }
      html.push(`<blockquote>${renderInline(quote.join(' '))}</blockquote>`);
      continue;
    }
    if (/^\*\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\*\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\*\s+/, ''));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length
      && lines[index].trim()
      && !/^(#{1,4})\s+|^\*\s+|^\d+\.\s+|^>\s+|^---$/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
  }

  return html.join('');
}

function sectionBetween(start, end) {
  const startIndex = guideMarkdown.indexOf(start);
  if (startIndex < 0) return '';
  const endIndex = end ? guideMarkdown.indexOf(end, startIndex + start.length) : guideMarkdown.length;
  return guideMarkdown.slice(startIndex, endIndex < 0 ? guideMarkdown.length : endIndex);
}

function hydrateGuide() {
  const stepPattern = /^## (\d{2})\.\s+(.+)\n([\s\S]*?)(?=^## \d{2}\.|^# 미리 준비할 서류)/gm;
  const guideSteps = [...guideMarkdown.matchAll(stepPattern)];

  document.querySelectorAll('.step-card').forEach((card, index) => {
    const match = guideSteps[index];
    if (!match) return;
    let detail = card.querySelector('.step-detail');
    if (!detail) {
      detail = document.createElement('div');
      detail.className = 'step-detail';
      card.append(detail);
    }
    const existingLink = detail.querySelector('.source-link');
    detail.innerHTML = `<div class="guide-content">${renderMarkdown(match[3])}</div>`;
    if (existingLink) detail.append(existingLink);
  });

  const sections = [
    ['# 미리 준비할 서류', '# 초보자가 반드시 물어봐야 할 10가지', '#fullDocuments'],
    ['# 초보자가 반드시 물어봐야 할 10가지', '# 가장 비싼 실수', '#fullQuestions'],
    ['# 가장 비싼 실수', '# 실무 순서 한 줄 요약', '#fullMistakes'],
    ['# 실무 순서 한 줄 요약', null, '#fullSummary'],
  ];
  sections.forEach(([start, end, selector]) => {
    const target = document.querySelector(selector);
    if (target) target.innerHTML = `<div class="guide-content">${renderMarkdown(sectionBetween(start, end))}</div>`;
  });
}

function updateDetailGroup(group) {
  const boxes = [...group.querySelectorAll('input[data-detail-check]')];
  if (!boxes.length) return;
  let status = group.querySelector('.detail-progress');
  if (!status) {
    status = document.createElement('div');
    status.className = 'detail-progress';
    const guide = group.querySelector('.guide-content');
    if (guide) guide.before(status);
  }
  const completed = boxes.filter((box) => box.checked).length;
  status.innerHTML = `<span>세부 체크</span><strong>${completed} / ${boxes.length}</strong>`;
}

function readStoredObject(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function makeCandidate(seed = {}) {
  const fallbackId = `candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const allowedStatuses = ['unreviewed', 'possible', 'conditional', 'blocked'];
  return {
    id: typeof seed.id === 'string' && seed.id
      ? seed.id
      : globalThis.crypto?.randomUUID?.() || fallbackId,
    name: typeof seed.name === 'string' ? seed.name : '',
    address: typeof seed.address === 'string' ? seed.address : '',
    status: allowedStatuses.includes(seed.status) ? seed.status : 'unreviewed',
    stepChecks: Array.isArray(seed.stepChecks) ? seed.stepChecks : [],
    stepStatuses: seed.stepStatuses && typeof seed.stepStatuses === 'object' ? seed.stepStatuses : {},
    detailChecks: Array.isArray(seed.detailChecks) ? seed.detailChecks : [],
    detailNotes: seed.detailNotes && typeof seed.detailNotes === 'object' ? seed.detailNotes : {},
  };
}

function loadCandidateState() {
  const stored = readStoredObject(candidateStorageKey);
  if (Array.isArray(stored.candidates) && stored.candidates.length) {
    const candidates = stored.candidates.map(makeCandidate);
    const activeId = candidates.some((candidate) => candidate.id === stored.activeId)
      ? stored.activeId
      : candidates[0].id;
    return { activeId, candidates };
  }

  const legacy = readStoredObject(legacyCandidateStorageKey);
  const first = makeCandidate({
    name: legacy.name || '',
    address: legacy.address || '',
    stepChecks: readStoredArray(storageKey),
    detailChecks: readStoredArray(detailStorageKey),
    detailNotes: readStoredObject(detailNotesStorageKey),
  });
  return { activeId: first.id, candidates: [first] };
}

function saveCandidateState() {
  localStorage.setItem(candidateStorageKey, JSON.stringify(candidateState));
}

function getActiveCandidate() {
  return candidateState.candidates.find((candidate) => candidate.id === candidateState.activeId)
    || candidateState.candidates[0];
}

function resizeNote(note) {
  note.style.height = 'auto';
  note.style.height = `${Math.max(note.scrollHeight, 72)}px`;
}

function candidateDisplayName(candidate, index) {
  return candidate.name.trim() || `후보지 ${index + 1}`;
}

function renderCandidatePanel(fields) {
  const active = getActiveCandidate();
  const list = fields.querySelector('[data-candidate-list]');
  list.innerHTML = candidateState.candidates.map((candidate, index) => `
    <button type="button" class="candidate-tab${candidate.id === active.id ? ' active' : ''}" data-candidate-id="${escapeHtml(candidate.id)}">
      <strong>${escapeHtml(candidateDisplayName(candidate, index))}</strong>
      <small>${escapeHtml(candidate.address.trim() || '주소 미입력')}</small>
    </button>
  `).join('');

  fields.querySelector('[data-candidate-field="name"]').value = active.name;
  fields.querySelector('[data-candidate-field="address"]').value = active.address;
  fields.querySelector('[data-candidate-field="status"]').value = active.status;
  const removeButton = fields.querySelector('[data-candidate-remove]');
  removeButton.disabled = candidateState.candidates.length === 1;
  removeButton.title = removeButton.disabled ? '후보지는 최소 1개가 필요합니다.' : '현재 후보지 삭제';

  list.querySelectorAll('[data-candidate-id]').forEach((button) => {
    button.addEventListener('click', () => {
      candidateState.activeId = button.dataset.candidateId;
      saveCandidateState();
      renderCandidatePanel(fields);
      loadCandidateData();
    });
  });
}

function injectCandidateFields(group) {
  if (!group.closest('.step-card')?.querySelector('input[data-step="1"]')) return;
  const fields = document.createElement('div');
  fields.className = 'candidate-fields';
  fields.innerHTML = `
    <div class="candidate-heading">
      <span>MY CANDIDATE</span>
      <strong>주소별 독립 체크리스트</strong>
      <small>후보지마다 12단계, 세부 체크, 판정과 메모가 따로 저장됩니다.</small>
    </div>
    <div class="candidate-toolbar">
      <div class="candidate-list" data-candidate-list></div>
      <button type="button" class="candidate-add" data-candidate-add>+ 후보지 추가</button>
    </div>
    <label>
      <span>후보지 이름</span>
      <input type="text" data-candidate-field="name" placeholder="예: 양주 후보지 A">
    </label>
    <label class="address-field">
      <span>도로명주소 · 지번</span>
      <input type="text" data-candidate-field="address" placeholder="예: 경기도 양주시 ○○로 12 / ○○동 123-4">
    </label>
    <label class="candidate-status-field">
      <span>종합 검토상태</span>
      <select data-candidate-field="status">
        <option value="unreviewed">미확인</option>
        <option value="possible">가능</option>
        <option value="conditional">조건부 가능</option>
        <option value="blocked">불가</option>
      </select>
    </label>
    <button type="button" class="candidate-remove" data-candidate-remove>현재 후보지 삭제</button>
    <p class="local-save-state" aria-live="polite">이 기기에 저장됨</p>
  `;
  const guide = group.querySelector('.guide-content');
  if (guide) guide.before(fields);

  fields.querySelectorAll('[data-candidate-field]').forEach((input) => {
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
      const active = getActiveCandidate();
      active[input.dataset.candidateField] = input.value;
      saveCandidateState();
      if (input.dataset.candidateField === 'name' || input.dataset.candidateField === 'address') {
        renderCandidatePanel(fields);
        input.focus();
        input.setSelectionRange?.(input.value.length, input.value.length);
      }
      const state = fields.querySelector('.local-save-state');
      state.textContent = '저장됨 ✓';
      clearTimeout(input.saveTimer);
      input.saveTimer = setTimeout(() => { state.textContent = '이 기기에 저장됨'; }, 1200);
    });
  });

  fields.querySelector('[data-candidate-add]').addEventListener('click', () => {
    const candidate = makeCandidate();
    candidateState.candidates.push(candidate);
    candidateState.activeId = candidate.id;
    saveCandidateState();
    renderCandidatePanel(fields);
    loadCandidateData();
    fields.querySelector('[data-candidate-field="name"]').focus();
  });

  fields.querySelector('[data-candidate-remove]').addEventListener('click', () => {
    const active = getActiveCandidate();
    if (candidateState.candidates.length === 1) return;
    const activeIndex = candidateState.candidates.findIndex((candidate) => candidate.id === active.id);
    if (!globalThis.confirm(`“${candidateDisplayName(active, activeIndex)}” 후보지와 저장된 체크 내용을 삭제할까요?`)) return;
    candidateState.candidates = candidateState.candidates.filter((candidate) => candidate.id !== active.id);
    candidateState.activeId = candidateState.candidates[0].id;
    saveCandidateState();
    renderCandidatePanel(fields);
    loadCandidateData();
  });

  renderCandidatePanel(fields);
}

function injectStepDecision(group, scope) {
  if (!/^\d+$/.test(scope)) return;
  const decision = document.createElement('div');
  decision.className = 'step-decision';
  decision.innerHTML = `
    <label>
      <span>이 단계 판정</span>
      <select data-step-status="${scope}">
        <option value="unreviewed">미확인</option>
        <option value="possible">가능</option>
        <option value="conditional">조건부 가능</option>
        <option value="blocked">불가</option>
      </select>
    </label>
    <small>‘불가’ 또는 ‘조건부 가능’이면 근거와 담당자 답변을 메모에 남기세요.</small>
  `;
  const guide = group.querySelector('.guide-content');
  if (guide) guide.before(decision);
  decision.querySelector('select').addEventListener('change', (event) => {
    const active = getActiveCandidate();
    active.stepStatuses[scope] = event.target.value;
    saveCandidateState();
    group.closest('.step-card').dataset.decision = event.target.value;
  });
}

function hydrateDetailChecks() {
  const groups = [...document.querySelectorAll('.step-detail, .field-panel')];

  groups.forEach((group, groupIndex) => {
    const scope = group.closest('.step-card')?.querySelector('input[data-step]')?.dataset.step
      || group.id
      || `field-${groupIndex}`;

    injectStepDecision(group, scope);

    group.querySelectorAll('.guide-content li').forEach((item, itemIndex) => {
      const id = `${scope}-${itemIndex}`;
      const original = item.innerHTML;
      item.innerHTML = `
        <label class="detail-check-item">
          <input type="checkbox" data-detail-check="${id}">
          <span class="detail-checkmark" aria-hidden="true"></span>
          <span class="detail-check-copy">${original}</span>
        </label>
        <div class="detail-note-wrap">
          <label for="note-${id}">이 항목 메모</label>
          <textarea id="note-${id}" class="detail-note" data-detail-note="${id}" placeholder="확인한 내용, 담당부서·담당자, 답변일과 근거를 적어두세요."></textarea>
          <span class="note-save-state" aria-live="polite">자동 저장</span>
        </div>
      `;
      const box = item.querySelector('input');
      const note = item.querySelector('[data-detail-note]');
      resizeNote(note);
      box.addEventListener('change', () => {
        item.classList.toggle('checked', box.checked);
        item.classList.toggle('note-open', box.checked || Boolean(note.value));
        if (box.checked) setTimeout(() => note.focus(), 80);
        const activeChecks = [...document.querySelectorAll('input[data-detail-check]:checked')]
          .map((checked) => checked.dataset.detailCheck);
        getActiveCandidate().detailChecks = activeChecks;
        saveCandidateState();
        updateDetailGroup(group);
      });
      note.addEventListener('input', () => {
        const notes = getActiveCandidate().detailNotes;
        if (note.value.trim()) notes[id] = note.value;
        else delete notes[id];
        saveCandidateState();
        item.classList.toggle('note-open', box.checked || Boolean(note.value));
        resizeNote(note);
        const state = item.querySelector('.note-save-state');
        state.textContent = '저장됨 ✓';
        clearTimeout(note.saveTimer);
        note.saveTimer = setTimeout(() => { state.textContent = '자동 저장'; }, 1200);
      });
    });
    injectCandidateFields(group);
    updateDetailGroup(group);
  });
}

function loadCandidateData() {
  const active = getActiveCandidate();
  const savedSteps = new Set(active.stepChecks);
  const savedDetails = new Set(active.detailChecks);
  checkboxes.forEach((box) => {
    box.checked = savedSteps.has(box.dataset.step);
    box.closest('.step-card').classList.toggle('completed', box.checked);
  });
  document.querySelectorAll('input[data-detail-check]').forEach((box) => {
    box.checked = savedDetails.has(box.dataset.detailCheck);
    const item = box.closest('li');
    const note = item?.querySelector('[data-detail-note]');
    if (note) {
      note.value = active.detailNotes[box.dataset.detailCheck] || '';
      resizeNote(note);
    }
    item?.classList.toggle('checked', box.checked);
    item?.classList.toggle('note-open', box.checked || Boolean(note?.value));
  });
  document.querySelectorAll('[data-step-status]').forEach((select) => {
    const value = active.stepStatuses[select.dataset.stepStatus] || 'unreviewed';
    select.value = value;
    select.closest('.step-card').dataset.decision = value;
  });
  document.querySelectorAll('.step-detail, .field-panel').forEach(updateDetailGroup);
  updateProgress(false);
}

function updateProgress(shouldSave = true) {
  const completed = checkboxes.filter((box) => box.checked).length;
  progressText.textContent = `${completed} / ${checkboxes.length}`;
  progressBar.style.width = `${(completed / checkboxes.length) * 100}%`;
  if (shouldSave && candidateState) {
    getActiveCandidate().stepChecks = checkboxes
      .filter((box) => box.checked)
      .map((box) => box.dataset.step);
    saveCandidateState();
  }
}

const cartStorageKey = 'sonsecha-shop-cart-v1';
const quoteStorageKey = 'sonsecha-quote-form-v1';
const shopElements = {
  categories: document.querySelector('#shopCategories'),
  search: document.querySelector('#productSearch'),
  sort: document.querySelector('#productSort'),
  results: document.querySelector('#productResults'),
  grid: document.querySelector('#productGrid'),
  drawer: document.querySelector('#cartDrawer'),
  backdrop: document.querySelector('.cart-backdrop'),
  items: document.querySelector('#cartItems'),
  itemCount: document.querySelector('#cartItemCount'),
  total: document.querySelector('#cartTotal'),
  copyButton: document.querySelector('#cartCopyButton'),
  quoteButton: document.querySelector('#quoteOpenButton'),
  feedback: document.querySelector('#cartFeedback'),
  quoteModal: document.querySelector('#quoteModal'),
  quoteBackdrop: document.querySelector('.quote-backdrop'),
  quoteItems: document.querySelector('#quoteItems'),
  quoteItemCount: document.querySelector('#quoteItemCount'),
  quoteTotal: document.querySelector('#quoteTotal'),
  quoteNumber: document.querySelector('#quoteNumber'),
  quoteDate: document.querySelector('#quoteDate'),
  quoteCopyButton: document.querySelector('#quoteCopyButton'),
  quotePrintButton: document.querySelector('#quotePrintButton'),
  quoteFeedback: document.querySelector('#quoteFeedback'),
};
const categoryLabels = new Map(productCategories.map((category) => [category.id, category.label]));

function normalizeCatalog(source) {
  return source
  .filter((product) => product && product.active !== false)
  .map((product, index) => ({
    id: String(product.id || `product-${index + 1}`),
    name: String(product.name || '이름 없는 상품'),
    category: categoryLabels.has(product.category) ? product.category : 'all',
    summary: String(product.summary || ''),
    price: typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0
      ? product.price
      : null,
    image: typeof product.image === 'string' ? product.image : '',
    shopUrl: typeof product.shopUrl === 'string' && /^https?:\/\//.test(product.shopUrl)
      ? product.shopUrl
      : '',
    badge: typeof product.badge === 'string' ? product.badge : '',
    inStock: product.inStock !== false,
    featured: Number.isFinite(Number(product.featured)) ? Number(product.featured) : 0,
  }));
}

let catalogProducts = normalizeCatalog(products);
let productById = new Map(catalogProducts.map((product) => [product.id, product]));
let activeShopCategory = 'all';
let cart = [];
let quoteDocumentNumber = '';

function formatPrice(price) {
  return price === null ? '가격 문의' : `${price.toLocaleString('ko-KR')}원`;
}

function loadCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(cartStorageKey) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((item) => productById.has(String(item.productId)))
      .map((item) => ({
        productId: String(item.productId),
        quantity: Math.min(99, Math.max(1, Number.parseInt(item.quantity, 10) || 1)),
      }));
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(cart));
}

function cartQuantity() {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function cartPriceTotal() {
  return cart.reduce((sum, item) => {
    const price = productById.get(item.productId)?.price;
    return sum + (price === null || price === undefined ? 0 : price * item.quantity);
  }, 0);
}

function cartHasQuoteProduct() {
  return cart.some((item) => productById.get(item.productId)?.price === null);
}

function updateCartBadges() {
  const quantity = cartQuantity();
  document.querySelectorAll('[data-cart-count]').forEach((badge) => {
    badge.textContent = String(quantity);
    badge.closest('button')?.classList.toggle('has-items', quantity > 0);
  });
}

function productCard(product) {
  const media = product.image
    ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">`
    : '<span class="product-placeholder-mark" aria-hidden="true">水</span>';
  const stockLabel = product.inStock ? '장바구니 담기' : '품절';
  return `
    <article class="product-card">
      <div class="product-media">
        ${media}
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
      </div>
      <div class="product-copy">
        <span class="product-category">${escapeHtml(categoryLabels.get(product.category) || '기타')}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.summary)}</p>
        <div class="product-buy-row">
          <strong>${formatPrice(product.price)}</strong>
          <div class="product-buy-actions">
            ${product.shopUrl ? `<a href="${escapeHtml(product.shopUrl)}" target="_blank" rel="noopener noreferrer">공식몰 상세</a>` : ''}
            <button type="button" data-add-product="${escapeHtml(product.id)}"${product.inStock ? '' : ' disabled'}>${stockLabel}</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function visibleProducts() {
  const query = shopElements.search.value.trim().toLocaleLowerCase('ko-KR');
  const filtered = catalogProducts.filter((product) => {
    const matchesCategory = activeShopCategory === 'all' || product.category === activeShopCategory;
    const matchesQuery = !query || `${product.name} ${product.summary}`.toLocaleLowerCase('ko-KR').includes(query);
    return matchesCategory && matchesQuery;
  });
  return filtered.sort((a, b) => {
    if (shopElements.sort.value === 'name') return a.name.localeCompare(b.name, 'ko-KR');
    if (shopElements.sort.value === 'price-low') return (a.price ?? Infinity) - (b.price ?? Infinity);
    if (shopElements.sort.value === 'price-high') return (b.price ?? -1) - (a.price ?? -1);
    return b.featured - a.featured;
  });
}

function renderProducts() {
  const visible = visibleProducts();
  shopElements.results.textContent = catalogProducts.length
    ? `전체 ${catalogProducts.length}개 상품 중 ${visible.length}개 표시`
    : '상품 등록 전 · 쇼핑몰 기능 준비 완료';
  if (visible.length) {
    shopElements.grid.innerHTML = visible.map(productCard).join('');
    return;
  }
  const isEmptyCatalog = catalogProducts.length === 0;
  shopElements.grid.innerHTML = `
    <div class="product-empty">
      <span class="product-empty-mark" aria-hidden="true">水</span>
      <p>${isEmptyCatalog ? 'COMING SOON' : 'NO RESULTS'}</p>
      <h3>${isEmptyCatalog ? '판매 상품을 준비하고 있습니다.' : '조건에 맞는 상품이 없습니다.'}</h3>
      <small>${isEmptyCatalog ? '상품 등록 단계에서 사진·가격·설명을 순차적으로 공개하겠습니다.' : '다른 카테고리나 검색어를 선택해 주세요.'}</small>
      ${isEmptyCatalog ? '<a href="tel:03116887759">제품 상담 031-1688-7759</a>' : ''}
    </div>
  `;
}

function addToCart(productId) {
  if (!productById.has(productId)) return;
  const existing = cart.find((item) => item.productId === productId);
  if (existing) existing.quantity = Math.min(99, existing.quantity + 1);
  else cart.push({ productId, quantity: 1 });
  saveCart();
  renderCart();
  openCart();
}

function changeCartQuantity(productId, change) {
  const item = cart.find((cartItem) => cartItem.productId === productId);
  if (!item) return;
  item.quantity += change;
  if (item.quantity < 1) cart = cart.filter((cartItem) => cartItem.productId !== productId);
  else item.quantity = Math.min(99, item.quantity);
  saveCart();
  renderCart();
}

function renderCart() {
  if (!cart.length) {
    shopElements.items.innerHTML = `
      <div class="cart-empty">
        <span aria-hidden="true">水</span>
        <strong>장바구니가 비어 있습니다.</strong>
        <p>필요한 상품을 담으면 수량과 예상 합계를 이곳에서 확인할 수 있습니다.</p>
      </div>
    `;
  } else {
    shopElements.items.innerHTML = cart.map((item) => {
      const product = productById.get(item.productId);
      const linePrice = product.price === null ? null : product.price * item.quantity;
      return `
        <article class="cart-item" data-cart-product="${escapeHtml(product.id)}">
          <div class="cart-item-media">${product.image ? `<img src="${escapeHtml(product.image)}" alt="">` : '<span aria-hidden="true">水</span>'}</div>
          <div class="cart-item-copy">
            <strong>${escapeHtml(product.name)}</strong>
            <small>${formatPrice(product.price)}</small>
            <div class="quantity-control" aria-label="${escapeHtml(product.name)} 수량">
              <button type="button" data-cart-action="decrease" aria-label="수량 줄이기">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-action="increase" aria-label="수량 늘리기">+</button>
            </div>
          </div>
          <div class="cart-item-price">
            <strong>${formatPrice(linePrice)}</strong>
            <button type="button" data-cart-action="remove">삭제</button>
          </div>
        </article>
      `;
    }).join('');
  }
  const total = cartPriceTotal();
  const hasQuoteProduct = cartHasQuoteProduct();
  shopElements.itemCount.textContent = `${cartQuantity()}개`;
  shopElements.total.textContent = `${total.toLocaleString('ko-KR')}원${hasQuoteProduct ? ' + 별도 견적' : ''}`;
  shopElements.copyButton.disabled = cart.length === 0;
  shopElements.quoteButton.disabled = cart.length === 0;
  updateCartBadges();
}

function openCart() {
  shopElements.backdrop.hidden = false;
  shopElements.drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cart-open');
  requestAnimationFrame(() => {
    shopElements.backdrop.classList.add('visible');
    shopElements.drawer.classList.add('open');
    shopElements.drawer.querySelector('[data-cart-close]')?.focus();
  });
}

function closeCart() {
  shopElements.backdrop.classList.remove('visible');
  shopElements.drawer.classList.remove('open');
  shopElements.drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('cart-open');
  setTimeout(() => { shopElements.backdrop.hidden = true; }, 240);
}

async function copyCartInquiry() {
  if (!cart.length) return;
  const lines = [
    '[손세차장 제품 문의]',
    ...cart.map((item) => {
      const product = productById.get(item.productId);
      return `- ${product.name} / ${item.quantity}개 / ${formatPrice(product.price)}`;
    }),
    `예상 합계: ${shopElements.total.textContent}`,
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    shopElements.feedback.textContent = '문의 목록을 복사했습니다. 상담 시 붙여넣어 주세요.';
  } catch {
    shopElements.feedback.textContent = '복사하지 못했습니다. 상품 목록을 화면에서 확인해 주세요.';
  }
}

function makeQuoteNumber() {
  const now = new Date();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now).replaceAll('-', '');
  return `Q-${date}-${String(now.getTime()).slice(-5)}`;
}

function loadQuoteForm() {
  const stored = readStoredObject(quoteStorageKey);
  document.querySelectorAll('[data-quote-field]').forEach((field) => {
    field.value = typeof stored[field.dataset.quoteField] === 'string'
      ? stored[field.dataset.quoteField]
      : '';
  });
}

function saveQuoteForm() {
  const values = {};
  document.querySelectorAll('[data-quote-field]').forEach((field) => {
    values[field.dataset.quoteField] = field.value;
  });
  localStorage.setItem(quoteStorageKey, JSON.stringify(values));
}

function quoteFieldValue(name) {
  return document.querySelector(`[data-quote-field="${name}"]`)?.value.trim() || '';
}

function renderQuote() {
  if (!quoteDocumentNumber) quoteDocumentNumber = makeQuoteNumber();
  shopElements.quoteNumber.textContent = quoteDocumentNumber;
  shopElements.quoteDate.textContent = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  shopElements.quoteItems.innerHTML = cart.map((item, index) => {
    const product = productById.get(item.productId);
    const linePrice = product.price === null ? null : product.price * item.quantity;
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${formatPrice(product.price)}</td>
        <td>${item.quantity}</td>
        <td>${formatPrice(linePrice)}</td>
      </tr>
    `;
  }).join('');
  shopElements.quoteItemCount.textContent = `${cartQuantity()}개`;
  shopElements.quoteTotal.textContent = `${cartPriceTotal().toLocaleString('ko-KR')}원${cartHasQuoteProduct() ? ' + 별도 견적' : ''}`;
}

function openQuote() {
  if (!cart.length) return;
  renderQuote();
  closeCart();
  shopElements.quoteBackdrop.hidden = false;
  shopElements.quoteModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('quote-open');
  requestAnimationFrame(() => {
    shopElements.quoteBackdrop.classList.add('visible');
    shopElements.quoteModal.classList.add('open');
    shopElements.quoteModal.querySelector('[data-quote-field]')?.focus();
  });
}

function closeQuote() {
  shopElements.quoteBackdrop.classList.remove('visible');
  shopElements.quoteModal.classList.remove('open');
  shopElements.quoteModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('quote-open');
  setTimeout(() => { shopElements.quoteBackdrop.hidden = true; }, 240);
}

async function copyQuote() {
  const customer = [quoteFieldValue('company'), quoteFieldValue('contact')].filter(Boolean).join(' / ') || '미입력';
  const contact = [quoteFieldValue('phone'), quoteFieldValue('email')].filter(Boolean).join(' / ') || '미입력';
  const lines = [
    `[간이견적서 ${quoteDocumentNumber}]`,
    `받는 분: ${customer}`,
    `연락처: ${contact}`,
    `배송·설치 주소: ${quoteFieldValue('address') || '미입력'}`,
    '',
    ...cart.map((item, index) => {
      const product = productById.get(item.productId);
      const linePrice = product.price === null ? null : product.price * item.quantity;
      return `${index + 1}. ${product.name} / ${item.quantity}개 / ${formatPrice(linePrice)}`;
    }),
    '',
    `상품 합계: ${shopElements.quoteTotal.textContent}`,
    `요청사항: ${quoteFieldValue('request') || '없음'}`,
    `문의전화: ${currentSiteContent.phone}`,
  ];
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    shopElements.quoteFeedback.textContent = '견적 내용을 복사했습니다.';
  } catch {
    shopElements.quoteFeedback.textContent = '견적 내용을 복사하지 못했습니다.';
  }
}

function printQuote() {
  document.body.classList.add('printing-quote');
  window.print();
}

async function loadCatalogProducts() {
  try {
    const response = await fetch('/api/products', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.products)) throw new Error('상품 데이터 형식 오류');
    catalogProducts = normalizeCatalog(payload.products);
    productById = new Map(catalogProducts.map((product) => [product.id, product]));
  } catch (error) {
    console.warn('서버 상품 데이터를 불러오지 못해 기본 상품을 사용합니다.', error);
  }
}

async function initializeShop() {
  shopElements.results.textContent = '상품을 불러오는 중…';
  shopElements.categories.innerHTML = productCategories.map((category) => `
    <button type="button" class="${category.id === 'all' ? 'active' : ''}" data-product-category="${escapeHtml(category.id)}">
      ${escapeHtml(category.label)}
    </button>
  `).join('');
  shopElements.categories.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product-category]');
    if (!button) return;
    activeShopCategory = button.dataset.productCategory;
    shopElements.categories.querySelector('.active')?.classList.remove('active');
    button.classList.add('active');
    renderProducts();
  });
  shopElements.search.addEventListener('input', renderProducts);
  shopElements.sort.addEventListener('change', renderProducts);
  shopElements.grid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-add-product]');
    if (button) addToCart(button.dataset.addProduct);
  });
  shopElements.items.addEventListener('click', (event) => {
    const button = event.target.closest('[data-cart-action]');
    const item = button?.closest('[data-cart-product]');
    if (!button || !item) return;
    if (button.dataset.cartAction === 'increase') changeCartQuantity(item.dataset.cartProduct, 1);
    if (button.dataset.cartAction === 'decrease') changeCartQuantity(item.dataset.cartProduct, -1);
    if (button.dataset.cartAction === 'remove') {
      cart = cart.filter((cartItem) => cartItem.productId !== item.dataset.cartProduct);
      saveCart();
      renderCart();
    }
  });
  document.querySelectorAll('[data-cart-open]').forEach((button) => button.addEventListener('click', openCart));
  document.querySelectorAll('[data-cart-close]').forEach((button) => button.addEventListener('click', closeCart));
  shopElements.copyButton.addEventListener('click', copyCartInquiry);
  shopElements.quoteButton.addEventListener('click', openQuote);
  document.querySelectorAll('[data-quote-close]').forEach((button) => button.addEventListener('click', closeQuote));
  document.querySelectorAll('[data-quote-field]').forEach((field) => field.addEventListener('input', saveQuoteForm));
  shopElements.quoteCopyButton.addEventListener('click', copyQuote);
  shopElements.quotePrintButton.addEventListener('click', printQuote);
  window.addEventListener('afterprint', () => document.body.classList.remove('printing-quote'));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (shopElements.quoteModal.classList.contains('open')) closeQuote();
    else if (shopElements.drawer.classList.contains('open')) closeCart();
  });
  await loadCatalogProducts();
  cart = loadCart();
  loadQuoteForm();
  saveCart();
  renderProducts();
  renderCart();
}

function syncSiteView() {
  const isShopView = globalThis.location.hash === '#shop';
  document.body.classList.toggle('shop-view', isShopView);
  document.body.classList.toggle('guide-view', !isShopView);
  document.querySelectorAll('[data-view-tab]').forEach((tab) => {
    const active = tab.dataset.viewTab === (isShopView ? 'shop' : 'guide');
    tab.classList.toggle('active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  document.title = isShopView
    ? '제품몰 · 손세차장 창업 로드맵'
    : '손세차장 창업 로드맵';
  if (isShopView) requestAnimationFrame(() => globalThis.scrollTo({ top: 0, behavior: 'auto' }));
}

checkboxes.forEach((box) => {
  box.addEventListener('change', () => {
    box.closest('.step-card').classList.toggle('completed', box.checked);
    updateProgress();
  });
});

document.querySelectorAll('.detail-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('.step-card');
    const open = card.classList.toggle('detail-open');
    button.textContent = open ? '−' : '+';
    button.setAttribute('aria-expanded', String(open));
  });
});

document.querySelectorAll('.phase-tabs button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.phase-tabs .active').classList.remove('active');
    button.classList.add('active');
    const phase = button.dataset.phase;
    document.querySelectorAll('.step-card').forEach((card) => {
      card.hidden = phase !== 'all' && card.dataset.phase !== phase;
    });
    document.querySelectorAll('.roadmap-shop-banner').forEach((banner) => {
      banner.hidden = phase !== 'all' && banner.dataset.phase !== phase;
    });
  });
});

document.querySelector('#resetButton').addEventListener('click', () => {
  const active = getActiveCandidate();
  const activeIndex = candidateState.candidates.findIndex((candidate) => candidate.id === active.id);
  if (!globalThis.confirm(`“${candidateDisplayName(active, activeIndex)}”의 체크·판정·메모를 초기화할까요? 후보지 이름과 주소는 유지됩니다.`)) return;
  active.stepChecks = [];
  active.stepStatuses = {};
  active.detailChecks = [];
  active.detailNotes = {};
  saveCandidateState();
  checkboxes.forEach((box) => {
    box.checked = false;
    box.closest('.step-card').classList.remove('completed');
  });
  document.querySelectorAll('input[data-detail-check]').forEach((box) => {
    box.checked = false;
    box.closest('li')?.classList.remove('checked');
  });
  document.querySelectorAll('[data-detail-note]').forEach((note) => {
    note.value = '';
    note.closest('li')?.classList.remove('note-open');
  });
  document.querySelectorAll('[data-step-status]').forEach((select) => {
    select.value = 'unreviewed';
    select.closest('.step-card').dataset.decision = 'unreviewed';
  });
  document.querySelectorAll('.step-detail, .field-panel').forEach(updateDetailGroup);
  updateProgress();
});

document.querySelector('#printButton').addEventListener('click', () => window.print());
globalThis.addEventListener('hashchange', syncSiteView);
syncSiteView();
initializeSiteContent();
hydrateGuide();
candidateState = loadCandidateState();
saveCandidateState();
hydrateDetailChecks();
loadCandidateData();
initializeShop();
