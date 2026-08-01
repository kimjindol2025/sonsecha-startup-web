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
  consultationPanel: document.querySelector('#consultationPanel'),
  feedbackPanel: document.querySelector('#feedbackPanel'),
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
  feedbackRefresh: document.querySelector('#feedbackRefresh'),
  feedbackStatusFilter: document.querySelector('#feedbackStatusFilter'),
  feedbackSearch: document.querySelector('#feedbackSearch'),
  feedbackList: document.querySelector('#feedbackList'),
  feedbackEmpty: document.querySelector('#feedbackEmpty'),
  feedbackBoardStatus: document.querySelector('#feedbackBoardStatus'),
  feedbackNewCount: document.querySelector('#feedbackNewCount'),
  feedbackReviewingCount: document.querySelector('#feedbackReviewingCount'),
  feedbackDoneCount: document.querySelector('#feedbackDoneCount'),
  feedbackTotalCount: document.querySelector('#feedbackTotalCount'),
  consultationRefresh: document.querySelector('#consultationRefresh'),
  consultationStatusFilter: document.querySelector('#consultationStatusFilter'),
  consultationSearch: document.querySelector('#consultationSearch'),
  consultationList: document.querySelector('#consultationList'),
  consultationDetail: document.querySelector('#consultationDetail'),
  consultationAdminStatus: document.querySelector('#consultationAdminStatus'),
  consultationReceivedCount: document.querySelector('#consultationReceivedCount'),
  consultationReviewingCount: document.querySelector('#consultationReviewingCount'),
  consultationMoreInfoCount: document.querySelector('#consultationMoreInfoCount'),
  consultationAnsweredCount: document.querySelector('#consultationAnsweredCount'),
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
let feedbackItems = [];
let feedbackSummaryCounts = { new: 0, reviewing: 0, done: 0, total: 0 };
let consultationItems = [];
let selectedConsultation = null;

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
  await Promise.all([loadContent(), loadProducts(), loadAnalytics(), loadFeedback(), loadConsultations()]);
  switchAdminSection('content');
}

function switchAdminSection(section) {
  elements.contentPanel.hidden = section !== 'content';
  elements.productPanel.hidden = section !== 'products';
  elements.analyticsPanel.hidden = section !== 'analytics';
  elements.consultationPanel.hidden = section !== 'consultations';
  elements.feedbackPanel.hidden = section !== 'feedback';
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

const feedbackKindLabels = {
  helpful: '도움됐어요',
  problem: '불편해요',
  idea: '기능 제안',
  other: '기타 의견',
};

const feedbackStatusLabels = {
  new: '새 의견',
  reviewing: '검토 중',
  done: '완료',
};

const feedbackDeviceLabels = {
  mobile: '모바일', tablet: '태블릿', desktop: 'PC', unknown: '기타',
};

function visibleFeedback() {
  const status = elements.feedbackStatusFilter.value;
  const query = elements.feedbackSearch.value.trim().toLocaleLowerCase('ko-KR');
  return feedbackItems.filter((item) => {
    const matchesStatus = status === 'all' || item.status === status;
    const matchesQuery = !query || `${item.message} ${item.area} ${feedbackKindLabels[item.kind] || item.kind}`.toLocaleLowerCase('ko-KR').includes(query);
    return matchesStatus && matchesQuery;
  });
}

function renderFeedback() {
  elements.feedbackNewCount.textContent = formatNumber(feedbackSummaryCounts.new);
  elements.feedbackReviewingCount.textContent = formatNumber(feedbackSummaryCounts.reviewing);
  elements.feedbackDoneCount.textContent = formatNumber(feedbackSummaryCounts.done);
  elements.feedbackTotalCount.textContent = formatNumber(feedbackSummaryCounts.total);
  const items = visibleFeedback();
  elements.feedbackList.innerHTML = items.map((item) => `
    <article class="feedback-board-item status-${escapeHtml(item.status)}" data-feedback-id="${Number(item.id)}">
      <div class="feedback-item-heading">
        <div>
          <span class="feedback-kind kind-${escapeHtml(item.kind)}">${escapeHtml(feedbackKindLabels[item.kind] || item.kind)}</span>
          <span class="feedback-state">${escapeHtml(feedbackStatusLabels[item.status] || item.status)}</span>
        </div>
        <time datetime="${escapeHtml(item.createdAt)}">${escapeHtml(formatDateTime(item.createdAt))}</time>
      </div>
      <p class="feedback-message">${escapeHtml(item.message)}</p>
      <div class="feedback-meta">
        <span>관련 화면 · <b>${escapeHtml(item.area)}</b></span>
        <span>${escapeHtml(feedbackDeviceLabels[item.device] || '기타')}</span>
        <span>${escapeHtml(item.page)}</span>
      </div>
      <div class="feedback-status-actions" aria-label="처리 상태 변경">
        ${Object.entries(feedbackStatusLabels).map(([status, label]) => `
          <button type="button" data-feedback-status="${status}"${item.status === status ? ' class="active" disabled' : ''}>${label}</button>
        `).join('')}
      </div>
    </article>
  `).join('');
  elements.feedbackEmpty.hidden = items.length > 0;
}

async function loadFeedback() {
  elements.feedbackRefresh.disabled = true;
  elements.feedbackBoardStatus.textContent = '피드백을 불러오는 중…';
  try {
    const payload = await api('/api/admin/feedback');
    feedbackItems = Array.isArray(payload.feedback) ? payload.feedback : [];
    feedbackSummaryCounts = { ...feedbackSummaryCounts, ...(payload.counts || {}) };
    renderFeedback();
    elements.feedbackBoardStatus.textContent = feedbackItems.length
      ? `최근 의견 ${formatDateTime(feedbackItems[0].createdAt)}`
      : '아직 등록된 피드백이 없습니다.';
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.feedbackBoardStatus.textContent = error.message;
  } finally {
    elements.feedbackRefresh.disabled = false;
  }
}

const consultationStatusLabels = {
  received: '접수', reviewing: '확인 중', more_info: '추가자료 요청',
  answered: '답변 완료', connected: '상담 연결', closed: '종료',
};
const candidateDecisionLabels = {
  unreviewed: '미확인', possible: '가능', conditional: '조건부 가능', blocked: '불가',
};

function consultationCandidates(snapshot) {
  return Array.isArray(snapshot?.candidates) ? snapshot.candidates : [snapshot || {}];
}

function visibleConsultations() {
  const status = elements.consultationStatusFilter.value;
  const query = elements.consultationSearch.value.trim().toLocaleLowerCase('ko-KR');
  return consultationItems.filter((item) => {
    const matchesStatus = status === 'all' || item.status === status;
    const matchesQuery = !query || `${item.receipt} ${item.candidateName} ${item.question}`.toLocaleLowerCase('ko-KR').includes(query);
    return matchesStatus && matchesQuery;
  });
}

function renderConsultationList() {
  const count = (status) => consultationItems.filter((item) => item.status === status).length;
  elements.consultationReceivedCount.textContent = formatNumber(count('received'));
  elements.consultationReviewingCount.textContent = formatNumber(count('reviewing'));
  elements.consultationMoreInfoCount.textContent = formatNumber(count('more_info'));
  elements.consultationAnsweredCount.textContent = formatNumber(count('answered'));
  const items = visibleConsultations();
  elements.consultationList.innerHTML = items.length ? items.map((item) => `
    <button type="button" class="consultation-list-item${selectedConsultation?.receipt === item.receipt ? ' active' : ''}" data-consultation-receipt="${escapeHtml(item.receipt)}">
      <span class="consultation-list-head"><strong>${escapeHtml(item.receipt)}</strong><em class="status-${escapeHtml(item.status)}">${escapeHtml(consultationStatusLabels[item.status] || item.status)}</em></span>
      <b>${escapeHtml(item.candidateName)}${Number(item.candidateCount || 1) > 1 ? ` · ${Number(item.candidateCount)}곳 비교` : ''}</b>
      <small>${item.addressShared ? escapeHtml(item.address || '주소 미입력') : '주소 공유 안 함'} · ${escapeHtml(formatDateTime(item.createdAt))}</small>
      <span class="consultation-list-metrics"><i>진행 ${Number(item.progress?.completed || 0)}/${Number(item.progress?.total || 0)}</i><i>미확인 ${Number(item.progress?.unchecked || 0)}</i><i>사진 ${Number(item.photoCount || 0)}</i></span>
      <p>${escapeHtml(item.question)}</p>
    </button>
  `).join('') : '<p class="consultation-admin-empty">조건에 맞는 상담 요청이 없습니다.</p>';
}

function renderConsultationDetail() {
  const consultation = selectedConsultation;
  if (!consultation) {
    elements.consultationDetail.innerHTML = '<p class="consultation-admin-empty">검토할 상담 건을 선택하세요.</p>';
    return;
  }
  const snapshot = consultation.snapshot || {};
  const candidates = consultationCandidates(snapshot);
  const isBundle = Array.isArray(snapshot.candidates);
  const contextOptions = candidates.map((candidate) => {
    const checks = Array.isArray(candidate.checks) ? candidate.checks : [];
    return `<optgroup label="${escapeHtml(candidate.candidateName || '후보지')}">${checks.map((item) => {
      const value = isBundle ? `${candidate.candidateRef}:${item.id}` : item.id;
      const label = `${candidate.candidateName || '후보지'} · ${item.step}단계 · ${item.label}`;
      return `<option value="${escapeHtml(value)}" data-label="${escapeHtml(label)}">${escapeHtml(item.step)}단계 · ${escapeHtml(item.label)}</option>`;
    }).join('')}</optgroup>`;
  }).join('');
  const candidateBlocks = candidates.map((candidate, index) => {
    const checks = Array.isArray(candidate.checks) ? candidate.checks : [];
    const steps = Array.isArray(candidate.steps) ? candidate.steps : [];
    const notes = Array.isArray(candidate.notes) ? candidate.notes : [];
    const photos = consultation.attachments.filter((photo) => isBundle
      ? photo.candidateRef === candidate.candidateRef : !photo.candidateRef);
    return `<article class="consultation-admin-candidate">
      <header><span>후보지 ${index + 1}</span><h4>${escapeHtml(candidate.candidateName || '후보지')}</h4><small>12단계 자료 · 진행 ${Number(candidate.progress?.completed || 0)}/${Number(candidate.progress?.total || 0)}</small></header>
      <section class="consultation-detail-block"><h4>공유된 기본정보</h4>
        <dl><div><dt>주소</dt><dd>${candidate.sharing?.address ? escapeHtml(candidate.address || '미입력') : '공유 안 함'}</dd></div><div><dt>예상 형태</dt><dd>${candidate.plan ? `${escapeHtml(candidate.plan.washType || '미입력')} · ${escapeHtml(candidate.plan.bayCount || '베이 수 미입력')}` : '공유 안 함'}</dd></div><div><dt>종합상태</dt><dd>${escapeHtml(candidateDecisionLabels[candidate.overallStatus] || candidate.overallStatus)}</dd></div></dl>
      </section>
      <details class="consultation-detail-block" open><summary>12단계 상태 · ${steps.length}단계</summary><div class="consultation-check-list">${steps.map((step) => `<p><span>${escapeHtml(step.label)}</span><strong>${step.completed ? '완료' : escapeHtml(candidateDecisionLabels[step.status] || step.status)}</strong></p>`).join('')}</div></details>
      <details class="consultation-detail-block"><summary>세부 체크 · ${checks.length}개</summary><div class="consultation-check-list">${checks.map((item) => `<p><span>${escapeHtml(item.label)}</span><strong>${item.completed ? '완료' : '미확인'}</strong></p>`).join('')}</div></details>
      <details class="consultation-detail-block"><summary>공유 메모 · ${notes.length}개</summary><div class="consultation-note-list">${notes.map((note) => `<article><strong>${escapeHtml(note.label)}</strong><p>${escapeHtml(note.text)}</p></article>`).join('') || '<p>공유된 메모가 없습니다.</p>'}</div></details>
      <section class="consultation-detail-block"><h4>선택 사진 · ${photos.length}장</h4><div class="consultation-admin-photos">${photos.map((photo) => `<article data-admin-photo="${photo.id}"><img src="/api/admin/consultations/${encodeURIComponent(consultation.receipt)}/photos/${photo.id}" alt="${escapeHtml(photo.name)}"><small>${escapeHtml(photo.name)}</small><button type="button" data-delete-admin-photo>첨부 삭제</button></article>`).join('') || '<p>공유된 사진이 없습니다.</p>'}</div></section>
    </article>`;
  }).join('');
  elements.consultationDetail.innerHTML = `
    <header class="consultation-detail-head">
      <div><span>${escapeHtml(consultation.receipt)}</span><h3>${candidates.length === 1 ? escapeHtml(candidates[0].candidateName || '후보지') : `후보지 ${candidates.length}곳 비교 검토`}</h3><small>${escapeHtml(formatDateTime(consultation.createdAt))} · 12부 전체 자료 · 주소 ${snapshot.sharing?.address ? '공유' : '비공유'}</small></div>
      <label><span>처리상태</span><select data-consultation-status>${Object.entries(consultationStatusLabels).map(([value, label]) => `<option value="${value}"${consultation.status === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
    </header>
    <div class="consultation-detail-meta">
      <p><span>진행률</span><strong>${Number(snapshot.progress?.completed || 0)} / ${Number(snapshot.progress?.total || 0)}</strong></p>
      <p><span>미확인</span><strong>${Number(snapshot.progress?.unchecked || 0)}</strong></p>
      <p><span>사진</span><strong>${consultation.attachments.length}</strong></p>
      <p><span>사용자 확인</span><strong>${consultation.userConfirmed ? '확인' : '미확인'}</strong></p>
    </div>
    <section class="consultation-detail-block"><h4>상담 질문</h4><p class="consultation-question-copy">${escapeHtml(consultation.question)}</p></section>
    <section class="consultation-admin-candidates">${candidateBlocks}</section>
    <section class="consultation-detail-block consultation-email-state"><h4>이메일 전달 상태</h4><p><strong>${consultation.emailStatus === 'sent' ? '발송 완료' : consultation.emailStatus === 'failed' ? '발송 실패' : '발송 대기'}</strong><span>${escapeHtml(consultation.emailError || '접수번호와 관리자 링크만 이메일로 알립니다.')}</span></p></section>
    <section class="consultation-chat-admin"><h4>상담 대화방</h4><div class="consultation-admin-messages">${consultation.messages.map((message) => `<article class="${escapeHtml(message.sender)}"><small>${message.sender === 'admin' ? '관리자' : '사용자'}${message.contextLabel ? ` · ${escapeHtml(message.contextLabel)}` : ''} · ${escapeHtml(formatDateTime(message.createdAt))}</small><p>${escapeHtml(message.body)}</p></article>`).join('') || '<p class="consultation-admin-empty">아직 대화가 없습니다.</p>'}</div>
      <form data-admin-reply-form><label><span>답변 위치</span><select name="context"><option value="">전체 상담</option>${contextOptions}</select></label><label class="wide"><span>관리자 답변</span><textarea name="body" maxlength="4000" rows="4" required placeholder="사용자에게 전달할 답변을 입력하세요."></textarea></label><button type="submit">답변 보내기</button><p data-admin-reply-status></p></form>
    </section>
  `;
  elements.consultationDetail.querySelector('[data-consultation-status]').addEventListener('change', async (event) => {
    event.target.disabled = true;
    try {
      const payload = await api(`/api/admin/consultations/${encodeURIComponent(consultation.receipt)}`, { method: 'PATCH', body: JSON.stringify({ status: event.target.value }) });
      selectedConsultation = payload.consultation;
      await loadConsultations(consultation.receipt);
      elements.consultationAdminStatus.textContent = '처리 상태를 저장했습니다.';
    } catch (error) { elements.consultationAdminStatus.textContent = error.message; event.target.disabled = false; }
  });
  elements.consultationDetail.querySelector('[data-admin-reply-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.querySelector('[data-admin-reply-status]');
    const select = form.elements.context;
    const option = select.selectedOptions[0];
    form.querySelector('button').disabled = true;
    status.textContent = '답변 저장 중…';
    try {
      const payload = await api(`/api/admin/consultations/${encodeURIComponent(consultation.receipt)}/messages`, {
        method: 'POST', body: JSON.stringify({ body: form.elements.body.value, contextId: select.value, contextLabel: option.dataset.label || '' }),
      });
      selectedConsultation = payload.consultation;
      renderConsultationDetail();
      await loadConsultations(consultation.receipt);
      elements.consultationAdminStatus.textContent = '답변을 상담 대화방에 저장했습니다.';
    } catch (error) { status.textContent = error.message; form.querySelector('button').disabled = false; }
  });
  elements.consultationDetail.querySelector('.consultation-admin-candidates')?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-admin-photo]');
    const photo = button?.closest('[data-admin-photo]');
    if (!photo || !globalThis.confirm('이 상담 건에서 첨부사진을 삭제할까요? 삭제 후 복구할 수 없습니다.')) return;
    try {
      await api(`/api/admin/consultations/${encodeURIComponent(consultation.receipt)}/photos/${photo.dataset.adminPhoto}`, { method: 'DELETE' });
      await loadConsultationDetail(consultation.receipt);
    } catch (error) { elements.consultationAdminStatus.textContent = error.message; }
  });
}

async function loadConsultationDetail(receipt) {
  elements.consultationAdminStatus.textContent = '상담 상세를 불러오는 중…';
  try {
    const payload = await api(`/api/admin/consultations/${encodeURIComponent(receipt)}`);
    selectedConsultation = payload.consultation;
    renderConsultationList();
    renderConsultationDetail();
    elements.consultationAdminStatus.textContent = '';
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.consultationAdminStatus.textContent = error.message;
  }
}

async function loadConsultations(preferredReceipt = '') {
  elements.consultationRefresh.disabled = true;
  try {
    const payload = await api('/api/admin/consultations');
    consultationItems = Array.isArray(payload.consultations) ? payload.consultations : [];
    renderConsultationList();
    const receipt = preferredReceipt || selectedConsultation?.receipt;
    if (receipt && consultationItems.some((item) => item.receipt === receipt)) await loadConsultationDetail(receipt);
    elements.consultationAdminStatus.textContent = consultationItems.length ? `상담 요청 ${consultationItems.length}건` : '아직 접수된 상담 요청이 없습니다.';
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.consultationAdminStatus.textContent = error.message;
  } finally { elements.consultationRefresh.disabled = false; }
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
elements.feedbackRefresh.addEventListener('click', loadFeedback);
elements.feedbackStatusFilter.addEventListener('change', renderFeedback);
elements.feedbackSearch.addEventListener('input', renderFeedback);
elements.consultationRefresh.addEventListener('click', () => loadConsultations(selectedConsultation?.receipt || ''));
elements.consultationStatusFilter.addEventListener('change', renderConsultationList);
elements.consultationSearch.addEventListener('input', renderConsultationList);
elements.consultationList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-consultation-receipt]');
  if (button) loadConsultationDetail(button.dataset.consultationReceipt);
});
elements.feedbackList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-feedback-status]');
  const item = button?.closest('[data-feedback-id]');
  if (!button || !item) return;
  button.disabled = true;
  elements.feedbackBoardStatus.textContent = '처리 상태 저장 중…';
  try {
    await api(`/api/admin/feedback/${encodeURIComponent(item.dataset.feedbackId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: button.dataset.feedbackStatus }),
    });
    await loadFeedback();
    elements.feedbackBoardStatus.textContent = '처리 상태를 변경했습니다.';
  } catch (error) {
    if (error.status === 401) showLogin('세션이 만료됐습니다. 다시 접속해 주세요.');
    else elements.feedbackBoardStatus.textContent = error.message;
    button.disabled = false;
  }
});

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
