const planStorageKey = 'sonsecha-business-plans-v1';

const budgetItems = [
  { key: 'deposit', label: '임대 보증금', group: '임대', example: 30000000, help: '월세와 별도로 묶이는 보증금' },
  { key: 'premium', label: '권리금', group: '임대', example: 0, help: '시설·영업권 인수 시에만 입력' },
  { key: 'contract', label: '중개·계약 부대비', group: '임대', example: 1500000, help: '중개보수·계약 관련 비용' },
  { key: 'permit', label: '건축·인허가·설계', group: '준비', example: 5000000, help: '건축사·도면·신고 준비 비용' },
  { key: 'floorDrain', label: '바닥·방수·배수 공사', group: '공사', example: 35000000, help: '철거·굴착·트렌치·방수 범위' },
  { key: 'wastewater', label: '폐수처리·배관', group: '공사', example: 25000000, help: '처리시설·집수·배관 공사' },
  { key: 'utilities', label: '전기·수도·소방', group: '공사', example: 10000000, help: '증설과 인입 조건에 따라 변동' },
  { key: 'equipment', label: '세차 장비', group: '장비', example: 30000000, help: '고압세척기·콤프레셔·청소기 등' },
  { key: 'interior', label: '인테리어·간판', group: '공사', example: 12000000, help: '고객 공간·직원 공간·외부 사인' },
  { key: 'supplies', label: '초도 약품·용품', group: '운영', example: 3000000, help: '세제·타월·소모품 최초 구비' },
  { key: 'insurance', label: '보험·사업자 준비', group: '준비', example: 2000000, help: '보험·등록·안전 준비 항목' },
  { key: 'marketing', label: '오픈 홍보비', group: '운영', example: 3000000, help: '간판 외 온라인·지역 홍보' },
  { key: 'workingCapital', label: '초기 운전자금', group: '운영', example: 20000000, help: '매출 안정 전 임대료·인건비 확보' },
  { key: 'contingency', label: '예비비', group: '예비', example: 10000000, help: '누락·변경 공사에 대비한 별도 금액' },
];

const monthlyCostItems = [
  { key: 'rent', label: '월 임대료', example: 2000000 },
  { key: 'labor', label: '인건비', example: 3000000 },
  { key: 'utilities', label: '수도·전기·연료', example: 1000000 },
  { key: 'supplies', label: '약품·소모품', example: 700000 },
  { key: 'cardFees', label: '카드·플랫폼 수수료', example: 300000 },
  { key: 'maintenance', label: '장비 유지보수', example: 300000 },
  { key: 'loanPayment', label: '대출 상환액', example: 0 },
  { key: 'other', label: '기타 고정비', example: 300000 },
];

const officialSources = [
  {
    kind: '상권·경쟁',
    title: '소상공인 상권정보시스템',
    description: '후보 지역의 업종 분포, 경쟁 점포와 상권 범위를 직접 확인합니다.',
    href: 'https://bigdata.sbiz.or.kr/',
    checks: ['반경별 동종 세차업체', '주거·상업·산업지역 구성', '요일·시간대 수요 가설'],
  },
  {
    kind: '지역 통계',
    title: '통계청 SGIS 업종통계지도',
    description: '인구·가구·사업체·교통과 생활권역 통계를 지도에서 비교합니다.',
    href: 'https://sgis.kostat.go.kr/view/indrStats/indrStatsMap',
    checks: ['생활권 인구와 가구', '전국사업체조사', '주거·교통 및 차량 유입 조건'],
  },
  {
    kind: '지원사업',
    title: 'K-Startup 창업지원포털',
    description: '현재 접수 중인 창업지원사업과 전문가 상담 창구를 확인합니다.',
    href: 'https://www.k-startup.go.kr/web',
    checks: ['신청 대상과 업력', '자부담·지원 제외 항목', '접수 마감과 제출서류'],
  },
  {
    kind: '정책자금',
    title: '소상공인정책자금',
    description: '정책자금 종류·금리·신청 안내와 상환스케줄 계산기를 확인합니다.',
    href: 'https://ols.semas.or.kr/ols/man/SMAN018M/page.do',
    checks: ['지원 대상 여부', '직접·대리대출 구분', '월 상환액을 운영비에 반영'],
  },
];

const statusLabels = {
  unreviewed: '미확인', possible: '가능', conditional: '조건부 가능', blocked: '불가',
};

const roadmapSteps = [
  '후보지 사전 확인',
  '건축사 용도변경 검토',
  '조건부 임대차계약',
  '폐수처리계획 설계',
  '폐수배출시설 허가·신고',
  '건축물 용도변경',
  '배수설비·도로 관련 신고',
  '시설공사',
  '사용승인·대장 확인',
  '폐수시설 가동 절차',
  '사업자등록',
  '보험·안전 확인 후 개업',
];

const requiredPlanFields = [
  { path: 'basic.ownerName', label: '작성자·예비 대표' },
  { path: 'funding.own', label: '현재 준비 가능한 자기자금' },
  { path: 'basic.targetRegion', label: '희망 지역' },
  { path: 'basic.floorArea', label: '예상 사업장 평수' },
  { path: 'basic.washType', label: '세차장 형태' },
  { path: 'basic.bayCount', label: '예상 베이 수' },
  { path: 'basic.preparationMonths', label: '전체 준비기간' },
  { path: 'basic.constructionWeeks', label: '예상 공사기간' },
  { path: 'basic.openingDate', label: '창업 예상일' },
  { path: 'basic.businessDescription', label: '사업 구상' },
  { path: 'sales.averageTicket', label: '평균 객단가' },
  { path: 'sales.dailyCars', label: '하루 평균 차량 수' },
  { path: 'sales.operatingDays', label: '월 영업일' },
  { path: 'research.targetCustomers', label: '예상 고객과 수요' },
  { path: 'research.competitorMemo', label: '주변 경쟁업체 조사' },
  { path: 'research.trafficMemo', label: '차량 유입·동선 조사' },
  { path: 'research.risks', label: '미확정 위험' },
  { path: 'actionPlan', label: '다음 행동과 일정' },
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function asText(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function makePlan(seed = {}) {
  const now = new Date().toISOString();
  return {
    id: typeof seed.id === 'string' && seed.id ? seed.id : makeId(),
    title: asText(seed.title) || '나의 손세차장 사업계획',
    linkedCandidateId: asText(seed.linkedCandidateId),
    basic: {
      ownerName: asText(seed.basic?.ownerName),
      targetRegion: asText(seed.basic?.targetRegion),
      siteAddress: asText(seed.basic?.siteAddress),
      floorArea: asText(seed.basic?.floorArea),
      washType: asText(seed.basic?.washType),
      bayCount: asText(seed.basic?.bayCount),
      businessDescription: asText(seed.basic?.businessDescription),
      preparationMonths: asText(seed.basic?.preparationMonths),
      constructionWeeks: asText(seed.basic?.constructionWeeks),
      openingDate: asText(seed.basic?.openingDate),
    },
    funding: {
      own: asText(seed.funding?.own),
      loan: asText(seed.funding?.loan),
      support: asText(seed.funding?.support),
    },
    budget: Object.fromEntries(budgetItems.map((item) => [item.key, asText(seed.budget?.[item.key])])),
    sales: {
      averageTicket: asText(seed.sales?.averageTicket),
      dailyCars: asText(seed.sales?.dailyCars),
      operatingDays: asText(seed.sales?.operatingDays),
    },
    monthlyCosts: Object.fromEntries(monthlyCostItems.map((item) => [item.key, asText(seed.monthlyCosts?.[item.key])])),
    research: {
      targetCustomers: asText(seed.research?.targetCustomers),
      competitorMemo: asText(seed.research?.competitorMemo),
      trafficMemo: asText(seed.research?.trafficMemo),
      supportMemo: asText(seed.research?.supportMemo),
      risks: asText(seed.research?.risks),
    },
    actionPlan: asText(seed.actionPlan),
    createdAt: asText(seed.createdAt) || now,
    updatedAt: asText(seed.updatedAt) || now,
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(planStorageKey) || '{}');
    const plans = Array.isArray(parsed.plans) && parsed.plans.length ? parsed.plans.map(makePlan) : [makePlan()];
    const activeId = plans.some((plan) => plan.id === parsed.activeId) ? parsed.activeId : plans[0].id;
    return { version: 1, activeId, plans };
  } catch {
    const first = makePlan();
    return { version: 1, activeId: first.id, plans: [first] };
  }
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function sumValues(object, definitions) {
  return definitions.reduce((total, item) => total + numberValue(object[item.key]), 0);
}

function formatMoney(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('ko-KR')}원`;
}

function setPath(object, path, value) {
  const parts = path.split('.');
  let cursor = object;
  parts.slice(0, -1).forEach((part) => {
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  });
  cursor[parts.at(-1)] = value;
}

function getPath(object, path) {
  return path.split('.').reduce((value, part) => value?.[part], object);
}

function input(path, label, value, options = {}) {
  const type = options.type || 'text';
  const attributes = [
    `type="${type}"`,
    `data-plan-path="${path}"`,
    `value="${escapeHtml(value)}"`,
    options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : '',
    options.min != null ? `min="${options.min}"` : '',
    options.step != null ? `step="${options.step}"` : '',
    options.inputmode ? `inputmode="${options.inputmode}"` : '',
  ].filter(Boolean).join(' ');
  return `<label class="plan-field"><span>${escapeHtml(label)}</span><input ${attributes}>${options.help ? `<small>${escapeHtml(options.help)}</small>` : ''}</label>`;
}

function textarea(path, label, value, placeholder, rows = 4) {
  return `<label class="plan-field plan-field-wide"><span>${escapeHtml(label)}</span><textarea rows="${rows}" data-plan-path="${path}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea></label>`;
}

function moneyInput(path, label, value, help = '') {
  return input(path, label, value, {
    type: 'number', min: 0, step: 100000, inputmode: 'numeric', placeholder: '0', help,
  });
}

function candidateMetrics(candidate) {
  if (!candidate) return null;
  const completed = Array.isArray(candidate.stepChecks) ? candidate.stepChecks.length : 0;
  const notes = candidate.detailNotes && typeof candidate.detailNotes === 'object'
    ? Object.values(candidate.detailNotes).filter((value) => String(value).trim()).length : 0;
  return { completed, notes, status: statusLabels[candidate.status] || '미확인' };
}

function calculations(plan) {
  const budgetTotal = sumValues(plan.budget, budgetItems);
  const fundingTotal = sumValues(plan.funding, [{ key: 'own' }, { key: 'loan' }, { key: 'support' }]);
  const monthlySales = numberValue(plan.sales.averageTicket) * numberValue(plan.sales.dailyCars) * numberValue(plan.sales.operatingDays);
  const monthlyCosts = sumValues(plan.monthlyCosts, monthlyCostItems);
  const monthlyProfit = monthlySales - monthlyCosts;
  const denominator = numberValue(plan.sales.averageTicket) * numberValue(plan.sales.operatingDays);
  const breakEvenCars = denominator > 0 ? Math.ceil(monthlyCosts / denominator) : 0;
  const coreValues = [
    plan.funding.own, plan.basic.targetRegion, plan.basic.washType, plan.basic.floorArea,
    plan.basic.preparationMonths, plan.basic.constructionWeeks, plan.basic.openingDate,
    plan.basic.businessDescription, plan.sales.averageTicket, plan.sales.dailyCars,
    plan.research.targetCustomers, plan.research.competitorMemo,
  ];
  const completed = coreValues.filter((value) => String(value).trim()).length;
  return { budgetTotal, fundingTotal, gap: fundingTotal - budgetTotal, monthlySales, monthlyCosts, monthlyProfit, breakEvenCars, completed, total: coreValues.length };
}

function renderBudget(plan) {
  return budgetItems.map((item) => `<article class="plan-budget-item"><div><b>${escapeHtml(item.group)}</b><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.help)}</small></div>${moneyInput(`budget.${item.key}`, `${item.label} 금액`, plan.budget[item.key])}</article>`).join('');
}

function renderMonthlyCosts(plan) {
  return monthlyCostItems.map((item) => moneyInput(`monthlyCosts.${item.key}`, item.label, plan.monthlyCosts[item.key])).join('');
}

function renderSources() {
  return officialSources.map((source) => `<article class="plan-source-card"><span>${escapeHtml(source.kind)}</span><h3>${escapeHtml(source.title)}</h3><p>${escapeHtml(source.description)}</p><ul>${source.checks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><a href="${escapeHtml(source.href)}" target="_blank" rel="noopener noreferrer">공식 자료 열기 ↗</a></article>`).join('');
}

function missingFields(plan) {
  return requiredPlanFields.filter((item) => !String(getPath(plan, item.path) ?? '').trim());
}

function candidateStepState(candidate, index) {
  const step = String(index + 1);
  const checked = Array.isArray(candidate?.stepChecks) && candidate.stepChecks.map(String).includes(step);
  const decision = statusLabels[candidate?.stepStatuses?.[step]] || '미확인';
  return { checked, decision };
}

function documentRow(label, value, options = {}) {
  const className = options.emphasis ? ' class="emphasis"' : '';
  return `<div${className}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function planDocumentHtml(plan, calc, candidate, candidateLabel = '') {
  const linkedMetrics = candidateMetrics(candidate);
  const missing = missingFields(plan);
  const budgetRows = budgetItems.map((item) => documentRow(`${item.group} · ${item.label}`, formatMoney(numberValue(plan.budget[item.key])))).join('');
  const fundingRows = [
    documentRow('자기자금', formatMoney(numberValue(plan.funding.own))),
    documentRow('대출 계획', formatMoney(numberValue(plan.funding.loan))),
    documentRow('지원금 계획', formatMoney(numberValue(plan.funding.support))),
    documentRow('합계', formatMoney(calc.fundingTotal), { emphasis: true }),
    documentRow(calc.gap >= 0 ? '예상 자금 여유' : '추가 확보 필요', formatMoney(Math.abs(calc.gap)), { emphasis: true }),
  ].join('');
  const monthlyRows = monthlyCostItems.map((item) => documentRow(item.label, formatMoney(numberValue(plan.monthlyCosts[item.key])))).join('');
  const stageRows = candidate ? roadmapSteps.map((label, index) => {
    const state = candidateStepState(candidate, index);
    return `<li><b>${String(index + 1).padStart(2, '0')}</b><span>${escapeHtml(label)}</span><em class="${state.checked ? 'complete' : 'pending'}">${state.checked ? '체크 완료' : '미완료'}</em><strong>${escapeHtml(state.decision)}</strong></li>`;
  }).join('') : '';
  const candidateNotes = candidate?.detailNotes && typeof candidate.detailNotes === 'object'
    ? Object.values(candidate.detailNotes).map((value) => String(value).trim()).filter(Boolean) : [];
  const executiveSummary = `${plan.basic.ownerName || '예비 창업자'}는 ${plan.basic.targetRegion || '희망 지역 확인 필요'}에서 ${plan.basic.floorArea || '규모 확인 필요'}평, ${plan.basic.bayCount || '수량 확인 필요'}베이 규모의 ${plan.basic.washType || '형태 확인 필요'} 창업을 검토한다. 목표 개업일은 ${plan.basic.openingDate || '확인 필요'}이며, 준비기간 ${plan.basic.preparationMonths || '확인 필요'}개월과 공사기간 ${plan.basic.constructionWeeks || '확인 필요'}주를 가정했다. 현재 입력 기준 예상 창업비는 ${formatMoney(calc.budgetTotal)}, 자금 확보계획은 ${formatMoney(calc.fundingTotal)}으로 ${calc.gap >= 0 ? `예상 여유자금은 ${formatMoney(calc.gap)}` : `추가 확보가 필요한 금액은 ${formatMoney(Math.abs(calc.gap))}`}이다.`;

  return `<article class="plan-document" data-plan-document>
    <header><div><p>HAND CAR WASH BUSINESS PLAN</p><h2>${escapeHtml(plan.title)}</h2><span>${escapeHtml(plan.basic.targetRegion || '희망 지역 미입력')} · 작성일 ${new Intl.DateTimeFormat('ko-KR').format(new Date())}</span></div><b>${calc.completed}/${calc.total} 핵심항목</b></header>
    <section class="plan-document-overview"><div><span>사업 형태</span><strong>${escapeHtml(plan.basic.washType || '확인 필요')} · ${escapeHtml(plan.basic.bayCount || '-')}베이</strong></div><div><span>사업장 규모</span><strong>${escapeHtml(plan.basic.floorArea || '-')}평</strong></div><div><span>개업 목표</span><strong>${escapeHtml(plan.basic.openingDate || '확인 필요')}</strong></div><div><span>연결 후보지</span><strong>${candidate ? escapeHtml(candidateLabel) : '독립 계획서'}</strong></div></section>

    <section data-document-section="executive"><h3>01. 사업계획 요약</h3><p>${escapeHtml(executiveSummary)}</p><div class="plan-document-numbers"><p><span>예상 창업비</span><strong>${formatMoney(calc.budgetTotal)}</strong></p><p><span>자금 확보계획</span><strong>${formatMoney(calc.fundingTotal)}</strong></p><p><span>월 매출 가정</span><strong>${formatMoney(calc.monthlySales)}</strong></p><p><span>단순 월 잔액</span><strong>${formatMoney(calc.monthlyProfit)}</strong></p></div></section>

    <section data-document-section="business"><h3>02. 사업 개요와 서비스 구상</h3><div class="plan-document-detail-grid">${documentRow('작성자·예비 대표', plan.basic.ownerName || '확인 필요')}${documentRow('희망 지역', plan.basic.targetRegion || '확인 필요')}${documentRow('후보지 주소', plan.basic.siteAddress || '확인 필요')}${documentRow('예상 규모', `${plan.basic.floorArea || '확인 필요'}평 · ${plan.basic.bayCount || '확인 필요'}베이`)}${documentRow('세차장 형태', plan.basic.washType || '확인 필요')}</div><h4>제공하려는 서비스와 차별점</h4><p>${escapeHtml(plan.basic.businessDescription || '아직 작성하지 않았습니다. 제공 서비스, 가격대, 예약 방식과 차별점을 확인해야 합니다.')}</p></section>

    <section data-document-section="schedule"><h3>03. 준비 일정</h3><ol class="plan-document-timeline"><li><span>현재</span><strong>기초 조사와 후보지 검토</strong><p>희망 지역·상권·경쟁·후보지의 건축 및 환경 조건을 확인합니다.</p></li><li><span>${escapeHtml(plan.basic.preparationMonths || '-')}개월</span><strong>전체 준비기간 가정</strong><p>임대차 확정 전에 용도변경, 폐수, 배수, 진입 조건을 먼저 확인합니다.</p></li><li><span>${escapeHtml(plan.basic.constructionWeeks || '-')}주</span><strong>공사기간 가정</strong><p>인허가·신고 수리 후 승인된 조건과 도면을 기준으로 실제 공정을 확정합니다.</p></li><li><span>${escapeHtml(plan.basic.openingDate || '미정')}</span><strong>개업 목표</strong><p>사용승인, 가동 절차, 사업자등록, 보험·안전 확인이 끝난 뒤 개업합니다.</p></li></ol></section>

    <section data-document-section="budget"><h3>04. 창업예산 상세</h3><p>아래 금액은 사용자가 입력한 계획값입니다. 0원 항목도 누락 여부를 확인해야 합니다.</p><div class="plan-document-ledger">${budgetRows}${documentRow('예상 창업비 합계', formatMoney(calc.budgetTotal), { emphasis: true })}</div></section>

    <section data-document-section="funding"><h3>05. 자금 조달 계획</h3><div class="plan-document-ledger compact">${fundingRows}</div><small>지원금은 선정 전까지 확정 자금으로 간주하지 않으며, 대출 상환액은 월 운영비에 별도로 반영해야 합니다.</small></section>

    <section data-document-section="sales"><h3>06. 매출·운영비 가정</h3><div class="plan-document-detail-grid">${documentRow('평균 객단가', formatMoney(numberValue(plan.sales.averageTicket)))}${documentRow('하루 평균 차량', `${numberValue(plan.sales.dailyCars)}대`)}${documentRow('월 영업일', `${numberValue(plan.sales.operatingDays)}일`)}${documentRow('월 매출 가정', formatMoney(calc.monthlySales), { emphasis: true })}${documentRow('단순 손익분기 차량', calc.breakEvenCars ? `하루 ${calc.breakEvenCars}대` : '계산 조건 확인 필요', { emphasis: true })}</div><h4>월 운영비 상세</h4><div class="plan-document-ledger">${monthlyRows}${documentRow('월 운영비 합계', formatMoney(calc.monthlyCosts), { emphasis: true })}${documentRow('단순 월 잔액', formatMoney(calc.monthlyProfit), { emphasis: true })}</div><small>세금, 감가상각, 부가세, 계절 변동 등을 포함하지 않은 단순 계산이며 실제 수익을 보장하지 않습니다.</small></section>

    <section data-document-section="market"><h3>07. 시장·상권 조사 정리</h3><div class="plan-document-research"><article><span>예상 고객과 수요</span><p>${escapeHtml(plan.research.targetCustomers || '확인 필요')}</p></article><article><span>주변 경쟁업체</span><p>${escapeHtml(plan.research.competitorMemo || '확인 필요')}</p></article><article><span>차량 유입·동선</span><p>${escapeHtml(plan.research.trafficMemo || '확인 필요')}</p></article><article><span>지원사업·정책자금</span><p>${escapeHtml(plan.research.supportMemo || '확인 필요')}</p></article></div></section>

    ${candidate ? `<section data-document-section="candidate"><h3>08. 후보지 12단계 검토 기록</h3><p>${escapeHtml(candidateLabel)} · ${escapeHtml(candidate.address || '주소 미입력')} · 진행 ${linkedMetrics.completed}/12 · 종합 판정 ${escapeHtml(linkedMetrics.status)}</p><ol class="plan-document-stages">${stageRows}</ol>${candidateNotes.length ? `<h4>후보지에 작성된 메모</h4><ul class="plan-document-notes">${candidateNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>` : '<p class="plan-document-empty">작성된 후보지 세부 메모가 없습니다.</p>'}<small>체크와 판정은 사용자의 기존 후보지 기록을 옮긴 것이며 허가 가능성을 자동 확정하지 않습니다.</small></section>` : `<section data-document-section="candidate"><h3>08. 후보지 검토 기록</h3><p>연결된 후보지가 없습니다. 후보지가 정해지면 1~12단계 기록을 연결해 검토 근거를 보완할 수 있습니다.</p></section>`}

    <section data-document-section="sources"><h3>09. 확인할 공식 자료</h3><div class="plan-document-source-list">${officialSources.map((source) => `<div><span>${escapeHtml(source.kind)}</span><strong>${escapeHtml(source.title)}</strong><p>${escapeHtml(source.description)}</p><a href="${escapeHtml(source.href)}" target="_blank" rel="noopener noreferrer">공식 자료 열기 ↗</a></div>`).join('')}</div></section>

    <section data-document-section="action"><h3>10. 위험요인과 실행계획</h3><div class="plan-document-columns"><div><h4>아직 확정하지 못한 위험</h4><p>${escapeHtml(plan.research.risks || '아직 작성하지 않았습니다. 인허가, 임대차, 공사비, 폐수처리, 전력과 인력 조건을 확인해야 합니다.')}</p></div><div><h4>다음 행동과 일정</h4><p>${escapeHtml(plan.actionPlan || '아직 작성하지 않았습니다. 담당자, 확인일, 문의처와 다음 마감일을 정해야 합니다.')}</p></div></div></section>

    <section data-document-section="missing"><h3>11. 작성 전 보완할 항목</h3>${missing.length ? `<p>현재 ${missing.length}개 항목을 더 확인하면 계획서의 근거가 구체화됩니다.</p><ul class="plan-document-missing">${missing.map((item) => `<li>${escapeHtml(item.label)} <b>확인 필요</b></li>`).join('')}</ul>` : '<p class="plan-document-complete">핵심 작성 항목이 모두 입력되었습니다. 이제 입력값을 현장 견적과 공식 답변으로 검증하세요.</p>'}</section>

    <footer><p>본 문서는 사용자가 입력한 가정과 확인 기록을 자동 정리한 초안입니다. 실제 인허가·공사비·대출·지원사업·매출·수익은 관할 기관, 전문가와 현장 견적으로 다시 확인해야 합니다.</p><strong>대한이엔지 손세차장 창업 로드맵</strong></footer>
  </article>`;
}

function fullPlanText(plan, calc, candidate, candidateLabel = '') {
  const missing = missingFields(plan);
  const lines = [
    `[${plan.title}]`,
    `작성일: ${new Intl.DateTimeFormat('ko-KR').format(new Date())}`,
    '',
    '1. 사업 개요',
    `작성자: ${plan.basic.ownerName || '확인 필요'}`,
    `희망 지역: ${plan.basic.targetRegion || '확인 필요'}`,
    `후보지 주소: ${plan.basic.siteAddress || '확인 필요'}`,
    `규모·형태: ${plan.basic.floorArea || '확인 필요'}평 · ${plan.basic.bayCount || '확인 필요'}베이 · ${plan.basic.washType || '확인 필요'}`,
    `개업 목표: ${plan.basic.openingDate || '확인 필요'} · 준비 ${plan.basic.preparationMonths || '확인 필요'}개월 · 공사 ${plan.basic.constructionWeeks || '확인 필요'}주`,
    `사업 구상: ${plan.basic.businessDescription || '확인 필요'}`,
    '',
    '2. 창업예산 상세',
    ...budgetItems.map((item) => `${item.group} · ${item.label}: ${formatMoney(numberValue(plan.budget[item.key]))}`),
    `예상 창업비 합계: ${formatMoney(calc.budgetTotal)}`,
    '',
    '3. 자금 조달',
    `자기자금: ${formatMoney(numberValue(plan.funding.own))}`,
    `대출: ${formatMoney(numberValue(plan.funding.loan))}`,
    `지원금: ${formatMoney(numberValue(plan.funding.support))}`,
    `${calc.gap >= 0 ? '예상 여유' : '추가 확보 필요'}: ${formatMoney(Math.abs(calc.gap))}`,
    '',
    '4. 월 매출·운영비 가정',
    `평균 객단가 ${formatMoney(numberValue(plan.sales.averageTicket))} × 하루 ${numberValue(plan.sales.dailyCars)}대 × 월 ${numberValue(plan.sales.operatingDays)}일 = ${formatMoney(calc.monthlySales)}`,
    ...monthlyCostItems.map((item) => `${item.label}: ${formatMoney(numberValue(plan.monthlyCosts[item.key]))}`),
    `월 운영비 합계: ${formatMoney(calc.monthlyCosts)} · 단순 월 잔액: ${formatMoney(calc.monthlyProfit)} · 손익분기: 하루 ${calc.breakEvenCars}대`,
    '',
    '5. 시장·상권 조사',
    `예상 고객과 수요: ${plan.research.targetCustomers || '확인 필요'}`,
    `경쟁업체: ${plan.research.competitorMemo || '확인 필요'}`,
    `차량 유입·동선: ${plan.research.trafficMemo || '확인 필요'}`,
    `지원사업·정책자금: ${plan.research.supportMemo || '확인 필요'}`,
  ];
  if (candidate) {
    lines.push('', `6. 후보지 검토 · ${candidateLabel}`, ...roadmapSteps.map((label, index) => {
      const status = candidateStepState(candidate, index);
      return `${index + 1}. ${label}: ${status.checked ? '체크 완료' : '미완료'} · ${status.decision}`;
    }));
  }
  lines.push('', '7. 위험과 다음 행동', `위험: ${plan.research.risks || '확인 필요'}`, `다음 행동: ${plan.actionPlan || '확인 필요'}`, '', `보완 항목: ${missing.length ? missing.map((item) => item.label).join(', ') : '핵심 항목 입력 완료'}`, '', '※ 사용자 입력과 가정을 자동 정리한 초안이며, 인허가·공사비·대출·지원·수익을 확정하지 않습니다.');
  return lines.join('\n');
}

export function initializeBusinessPlan({ getCandidateState, candidateDisplayName }) {
  const root = document.querySelector('#businessPlanApp');
  if (!root) return { activate() {} };
  let state = loadState();
  let saveTimer;

  function activePlan() {
    return state.plans.find((plan) => plan.id === state.activeId) || state.plans[0];
  }

  function candidates() {
    const value = getCandidateState?.();
    return Array.isArray(value?.candidates) ? value.candidates : [];
  }

  function candidateName(candidate) {
    const list = candidates();
    const index = list.findIndex((item) => item.id === candidate.id);
    return candidateDisplayName?.(candidate, Math.max(index, 0)) || candidate.name || `후보지 ${index + 1}`;
  }

  function save(message = '이 기기에 자동 저장됨') {
    const plan = activePlan();
    plan.updatedAt = new Date().toISOString();
    localStorage.setItem(planStorageKey, JSON.stringify(state));
    clearTimeout(saveTimer);
    const status = root.querySelector('[data-plan-save-status]');
    if (status) status.textContent = message;
    saveTimer = setTimeout(() => {
      const current = root.querySelector('[data-plan-save-status]');
      if (current) current.textContent = '이 기기에 자동 저장됨';
    }, 1600);
  }

  function render() {
    const plan = activePlan();
    const list = candidates();
    const linked = list.find((candidate) => candidate.id === plan.linkedCandidateId);
    const linkedMetrics = candidateMetrics(linked);
    const calc = calculations(plan);
    root.innerHTML = `
      <header class="plan-hero">
        <div><p>MY BUSINESS PLAN</p><h1 id="businessPlanHeading">나의 손세차장 사업계획서</h1><span>몇 가지 질문에 답하고 공식 자료를 확인하면 예산·일정·실행계획이 한 문서로 정리됩니다.</span></div>
        <div class="plan-privacy"><strong>내 정보는 이 기기에 저장</strong><small>자동 서버 전송 없음 · 사용자가 직접 인쇄·공유</small></div>
      </header>

      <section class="plan-toolbar" aria-label="사업계획서 관리">
        <label><span>작성 중인 계획서</span><select data-plan-select>${state.plans.map((item, index) => `<option value="${escapeHtml(item.id)}" ${item.id === plan.id ? 'selected' : ''}>${escapeHtml(item.title || `사업계획서 ${index + 1}`)}</option>`).join('')}</select></label>
        <button type="button" data-plan-action="new">+ 새 계획서</button>
        <button type="button" data-plan-action="view-document">전체 계획서 보기</button>
        <button type="button" data-plan-action="copy">내용 복사</button>
        <button type="button" class="plan-primary-action" data-plan-action="print">인쇄 · PDF</button>
        <button type="button" class="plan-danger-action" data-plan-action="delete" ${state.plans.length === 1 ? 'disabled' : ''}>삭제</button>
        <small data-plan-save-status>이 기기에 자동 저장됨</small>
      </section>

      <div class="plan-progress" aria-label="핵심 질문 작성 진행률"><span style="width:${Math.round(calc.completed / calc.total * 100)}%"></span><b>${calc.completed} / ${calc.total} 핵심 질문 작성</b></div>

      <section class="plan-card plan-candidate-card">
        <div class="plan-card-head"><div><span>01 · 기록 연결</span><h2>검토 중인 후보지가 있나요?</h2><p>후보지를 연결하면 주소·형태·베이 수와 12단계 진행상태를 사업계획서에 참고자료로 불러옵니다.</p></div><a href="#roadmap">후보지 기록 확인 →</a></div>
        <div class="plan-candidate-row">
          <label class="plan-field"><span>후보지 선택 · 선택사항</span><select data-plan-path="linkedCandidateId"><option value="">연결하지 않고 작성</option>${list.map((candidate) => `<option value="${escapeHtml(candidate.id)}" ${candidate.id === plan.linkedCandidateId ? 'selected' : ''}>${escapeHtml(candidateName(candidate))}</option>`).join('')}</select></label>
          <button type="button" data-plan-action="import-candidate" ${linked ? '' : 'disabled'}>후보지 기본정보 불러오기</button>
        </div>
        ${linked ? `<div class="plan-candidate-summary"><strong>${escapeHtml(candidateName(linked))}</strong><span>${escapeHtml(linked.address || '주소 미입력')}</span><dl><div><dt>12단계</dt><dd>${linkedMetrics.completed}/12</dd></div><div><dt>종합 판정</dt><dd>${escapeHtml(linkedMetrics.status)}</dd></div><div><dt>작성 메모</dt><dd>${linkedMetrics.notes}개</dd></div></dl></div>` : '<p class="plan-empty-note">후보지가 없어도 독립된 사업계획서를 작성할 수 있습니다.</p>'}
      </section>

      <section class="plan-card">
        <div class="plan-card-head"><div><span>02 · 기초 질문</span><h2>먼저, 어떤 창업을 준비하나요?</h2><p>모르는 항목은 비워 두고 조사 후 채워도 됩니다.</p></div></div>
        <div class="plan-form-grid">
          ${input('title', '사업계획서 이름', plan.title, { placeholder: '예: 양주 2베이 손세차장 계획' })}
          ${input('basic.ownerName', '작성자·예비 대표', plan.basic.ownerName, { placeholder: '이름 또는 팀명' })}
          ${moneyInput('funding.own', '현재 준비 가능한 자기자금', plan.funding.own, '실제로 투입 가능한 금액만 입력')}
          ${input('basic.targetRegion', '희망 지역', plan.basic.targetRegion, { placeholder: '예: 경기도 양주시 옥정동' })}
          ${input('basic.siteAddress', '후보지 주소 · 있으면', plan.basic.siteAddress, { placeholder: '도로명 또는 지번' })}
          ${input('basic.floorArea', '예상 사업장 평수', plan.basic.floorArea, { type: 'number', min: 0, step: 1, inputmode: 'decimal', placeholder: '예: 80' })}
          <label class="plan-field"><span>하고 싶은 세차장 형태</span><select data-plan-path="basic.washType"><option value="">선택 또는 조사 중</option>${['손세차 전문','디테일링·광택','손세차+디테일링','출장·예약형','기타'].map((value) => `<option ${plan.basic.washType === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
          ${input('basic.bayCount', '예상 세차 베이 수', plan.basic.bayCount, { type: 'number', min: 1, step: 1, inputmode: 'numeric', placeholder: '예: 2' })}
          ${input('basic.preparationMonths', '전체 준비기간 · 개월', plan.basic.preparationMonths, { type: 'number', min: 0, step: 1, inputmode: 'numeric', placeholder: '예: 6' })}
          ${input('basic.constructionWeeks', '예상 공사기간 · 주', plan.basic.constructionWeeks, { type: 'number', min: 0, step: 1, inputmode: 'numeric', placeholder: '예: 8' })}
          ${input('basic.openingDate', '창업 예상일', plan.basic.openingDate, { type: 'date' })}
          ${textarea('basic.businessDescription', '무엇을 하고 싶은가요?', plan.basic.businessDescription, '제공할 서비스, 가격대, 예약 방식, 다른 세차장과 다르게 하고 싶은 점을 자유롭게 적으세요.', 5)}
        </div>
      </section>

      <section class="plan-card">
        <div class="plan-card-head"><div><span>03 · 창업예산</span><h2>처음 필요한 돈을 빠짐없이 나눕니다.</h2><p>아래 예시 금액은 견적이 아닌 작성 연습용 가정입니다. 실제 금액은 후보지·도면·현장 견적으로 교체해야 합니다.</p></div><div class="plan-head-actions"><button type="button" data-plan-action="fill-budget-example">작성 예시 넣기</button><button type="button" data-plan-action="clear-budget">금액 비우기</button></div></div>
        <div class="plan-budget-grid">${renderBudget(plan)}</div>
        <div class="plan-funding-grid">
          ${moneyInput('funding.own', '자기자금', plan.funding.own)}
          ${moneyInput('funding.loan', '대출 계획', plan.funding.loan)}
          ${moneyInput('funding.support', '지원금 계획', plan.funding.support, '선정 전에는 확정 자금으로 보지 않기')}
        </div>
        <div class="plan-summary-strip"><div><span>예상 창업비</span><strong data-plan-total="budget">${formatMoney(calc.budgetTotal)}</strong></div><div><span>자금 확보계획</span><strong data-plan-total="funding">${formatMoney(calc.fundingTotal)}</strong></div><div data-plan-gap-card class="${calc.gap >= 0 ? 'positive' : 'negative'}"><span>${calc.gap >= 0 ? '예상 여유' : '예상 부족'}</span><strong data-plan-total="gap">${formatMoney(Math.abs(calc.gap))}</strong></div></div>
      </section>

      <section class="plan-card">
        <div class="plan-card-head"><div><span>04 · 월 운영 가정</span><h2>매출 목표가 비용을 감당하는지 계산합니다.</h2><p>아래 계산은 입력값을 곱한 단순 시뮬레이션이며 실제 수익을 보장하지 않습니다.</p></div><button type="button" data-plan-action="fill-sales-example">작성 예시 넣기</button></div>
        <div class="plan-form-grid plan-sales-grid">
          ${moneyInput('sales.averageTicket', '평균 객단가', plan.sales.averageTicket)}
          ${input('sales.dailyCars', '하루 평균 차량 수', plan.sales.dailyCars, { type: 'number', min: 0, step: 1, inputmode: 'numeric', placeholder: '0' })}
          ${input('sales.operatingDays', '월 영업일', plan.sales.operatingDays, { type: 'number', min: 0, max: 31, step: 1, inputmode: 'numeric', placeholder: '0' })}
        </div>
        <div class="plan-monthly-costs">${renderMonthlyCosts(plan)}</div>
        <div class="plan-summary-strip four"><div><span>월 매출 가정</span><strong data-plan-total="sales">${formatMoney(calc.monthlySales)}</strong></div><div><span>월 운영비</span><strong data-plan-total="costs">${formatMoney(calc.monthlyCosts)}</strong></div><div class="${calc.monthlyProfit >= 0 ? 'positive' : 'negative'}"><span>단순 월 잔액</span><strong data-plan-total="profit">${formatMoney(calc.monthlyProfit)}</strong></div><div><span>단순 손익분기 차량</span><strong data-plan-total="break-even">하루 ${calc.breakEvenCars}대</strong></div></div>
      </section>

      <section class="plan-card">
        <div class="plan-card-head"><div><span>05 · 기본 리서치</span><h2>우리가 확인 순서와 공식 자료를 제공합니다.</h2><p>지역명만으로 자동 결론을 내리지 않습니다. 공식 자료를 열어 확인한 숫자와 현장 판단을 아래 메모에 남기세요.</p></div></div>
        <div class="plan-source-grid">${renderSources()}</div>
        <div class="plan-form-grid plan-research-notes">
          ${textarea('research.targetCustomers', '예상 고객과 수요', plan.research.targetCustomers, '예: 인근 산업단지 출퇴근 차량, 아파트 거주자, 법인 차량 등')}
          ${textarea('research.competitorMemo', '주변 경쟁업체 조사', plan.research.competitorMemo, '업체명, 거리, 가격, 강점, 예약 여부를 확인하세요.')}
          ${textarea('research.trafficMemo', '차량 유입·동선 조사', plan.research.trafficMemo, '도로 방향, 진입·회차, 대기 차량, 보행자와 민원 가능성을 적으세요.')}
          ${textarea('research.supportMemo', '지원사업·정책자금 확인', plan.research.supportMemo, '공고명, 대상, 신청기한, 자부담, 문의처를 원문 기준으로 적으세요.')}
          ${textarea('research.risks', '아직 확정하지 못한 위험', plan.research.risks, '인허가, 임대차, 공사비, 폐수처리, 전력, 인력 등 미확인 항목을 적으세요.')}
          ${textarea('actionPlan', '다음 행동과 일정', plan.actionPlan, '예: 8월 5일 건축과 문의 → 8월 8일 건축사 현장 확인 → 견적 3곳 비교')}
        </div>
      </section>

      ${planDocumentHtml(plan, calc, linked, linked ? candidateName(linked) : '')}`;
  }

  function updateDocument() {
    const plan = activePlan();
    const linked = candidates().find((candidate) => candidate.id === plan.linkedCandidateId);
    const documentNode = root.querySelector('[data-plan-document]');
    if (documentNode) documentNode.outerHTML = planDocumentHtml(plan, calculations(plan), linked, linked ? candidateName(linked) : '');
  }

  function updateCalculatedView() {
    const plan = activePlan();
    const calc = calculations(plan);
    const set = (key, value) => { const node = root.querySelector(`[data-plan-total="${key}"]`); if (node) node.textContent = value; };
    set('budget', formatMoney(calc.budgetTotal));
    set('funding', formatMoney(calc.fundingTotal));
    set('gap', formatMoney(Math.abs(calc.gap)));
    set('sales', formatMoney(calc.monthlySales));
    set('costs', formatMoney(calc.monthlyCosts));
    set('profit', formatMoney(calc.monthlyProfit));
    set('break-even', `하루 ${calc.breakEvenCars}대`);
    const gapCard = root.querySelector('[data-plan-gap-card]');
    if (gapCard) {
      gapCard.className = calc.gap >= 0 ? 'positive' : 'negative';
      gapCard.querySelector('span').textContent = calc.gap >= 0 ? '예상 여유' : '예상 부족';
    }
    const progress = root.querySelector('.plan-progress');
    if (progress) {
      progress.querySelector('span').style.width = `${Math.round(calc.completed / calc.total * 100)}%`;
      progress.querySelector('b').textContent = `${calc.completed} / ${calc.total} 핵심 질문 작성`;
    }
    updateDocument();
  }

  root.addEventListener('input', (event) => {
    const field = event.target.closest('[data-plan-path]');
    if (!field) return;
    setPath(activePlan(), field.dataset.planPath, field.value);
    save('입력 내용 저장됨');
    updateCalculatedView();
  });

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-plan-select]')) {
      state.activeId = event.target.value;
      save();
      render();
      return;
    }
    const field = event.target.closest('[data-plan-path]');
    if (!field) return;
    setPath(activePlan(), field.dataset.planPath, field.value);
    save('선택 내용 저장됨');
    if (field.dataset.planPath === 'linkedCandidateId') render();
    else updateCalculatedView();
  });

  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-plan-action]');
    if (!button) return;
    const action = button.dataset.planAction;
    const plan = activePlan();
    if (action === 'new') {
      const next = makePlan({ title: `나의 손세차장 사업계획 ${state.plans.length + 1}` });
      state.plans.push(next); state.activeId = next.id; save('새 계획서를 만들었습니다'); render();
    }
    if (action === 'delete' && state.plans.length > 1 && globalThis.confirm('현재 사업계획서를 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) {
      state.plans = state.plans.filter((item) => item.id !== plan.id); state.activeId = state.plans[0].id; save('계획서를 삭제했습니다'); render();
    }
    if (action === 'import-candidate') {
      const candidate = candidates().find((item) => item.id === plan.linkedCandidateId);
      if (!candidate) return;
      plan.basic.siteAddress = candidate.address || plan.basic.siteAddress;
      plan.basic.targetRegion = candidate.address?.split(/\s+/).slice(0, 2).join(' ') || plan.basic.targetRegion;
      plan.basic.washType = candidate.washType || plan.basic.washType;
      plan.basic.bayCount = candidate.bayCount || plan.basic.bayCount;
      if (plan.title === '나의 손세차장 사업계획') plan.title = `${candidateName(candidate)} 사업계획`;
      save('후보지 기본정보를 불러왔습니다'); render();
    }
    if (action === 'fill-budget-example') {
      if (budgetItems.some((item) => numberValue(plan.budget[item.key])) && !globalThis.confirm('현재 창업예산 금액을 작성 예시로 바꿀까요?')) return;
      budgetItems.forEach((item) => { plan.budget[item.key] = String(item.example); });
      save('작성 예시를 넣었습니다'); render();
    }
    if (action === 'clear-budget' && globalThis.confirm('입력한 창업예산 금액을 모두 비울까요?')) {
      budgetItems.forEach((item) => { plan.budget[item.key] = ''; }); save('창업예산을 비웠습니다'); render();
    }
    if (action === 'fill-sales-example') {
      plan.sales = { averageTicket: '35000', dailyCars: '10', operatingDays: '26' };
      monthlyCostItems.forEach((item) => { plan.monthlyCosts[item.key] = String(item.example); });
      save('월 운영 작성 예시를 넣었습니다'); render();
    }
    if (action === 'view-document') {
      updateDocument();
      root.querySelector('[data-plan-document]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (action === 'copy') {
      const linked = candidates().find((item) => item.id === plan.linkedCandidateId);
      const text = fullPlanText(plan, calculations(plan), linked, linked ? candidateName(linked) : '');
      try { await navigator.clipboard.writeText(text); save('전체 사업계획서를 복사했습니다'); }
      catch { save('복사하지 못했습니다. 인쇄·PDF를 이용해 주세요.'); }
    }
    if (action === 'print') {
      render();
      document.body.classList.add('printing-business-plan');
      setTimeout(() => globalThis.print(), 0);
    }
  });

  globalThis.addEventListener('afterprint', () => document.body.classList.remove('printing-business-plan'));
  render();
  return {
    activate() {
      render();
    },
  };
}
