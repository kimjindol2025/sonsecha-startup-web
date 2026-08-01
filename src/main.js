import guideMarkdown from '../README.md?raw';
import { installClickAnalytics } from './analytics.js';
import { initializeConsultations } from './consultations.js';
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
const candidateStatusLabels = {
  unreviewed: '미확인',
  possible: '가능',
  conditional: '조건부 가능',
  blocked: '불가',
};
const stepOneCheckGroups = [
  {
    id: 'online',
    title: '온라인에서 먼저 확인',
    description: '토지이음·정부24 등에서 서류와 기본 조건을 확인합니다.',
    itemIndexes: [0, 1, 2, 3, 7, 15],
    links: [
      {
        label: '토지이음',
        detail: '토지이용계획 확인',
        href: 'https://www.eum.go.kr/web/am/amMain.jsp',
      },
      {
        label: '정부24',
        detail: '건축물대장 열람',
        href: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000098&tp_seq=03',
      },
      {
        label: '인터넷등기소',
        detail: '등기사항증명서 확인',
        href: 'https://www.iros.go.kr/',
      },
    ],
  },
  {
    id: 'field',
    title: '현장에서 확인',
    description: '배수·진입로·공급 설비와 주변 여건을 직접 확인합니다.',
    itemIndexes: [4, 5, 6, 8, 9, 16, 17, 18],
  },
  {
    id: 'department',
    title: '관할 부서에 확인',
    description: '주소와 운영계획을 제시하고 담당 부서의 답변을 남깁니다.',
    itemIndexes: [10, 11, 12, 13, 14, 19],
  },
];
const onlineUsageGuides = {
  '1-0': {
    kicker: '토지이음',
    title: '토지이용계획상 용도지역 확인',
    description: '후보지의 지번을 기준으로 용도지역과 함께 지정된 지역·지구를 확인합니다.',
    links: [{ label: '토지이음 열기', href: 'https://www.eum.go.kr/web/am/amMain.jsp' }],
    steps: [
      '후보지의 정확한 지번을 준비합니다.',
      '토지이음에서 주소 또는 지번으로 토지를 검색합니다.',
      '검색 결과의 토지이용계획 화면을 엽니다.',
      '지역·지구등 지정여부에서 용도지역과 중첩된 지역·지구를 확인합니다.',
    ],
    checks: ['용도지역 명칭', '중첩 지정된 지역·지구', '열람한 지번과 실제 후보지의 일치 여부'],
    record: '용도지역·지역지구 명칭, 확인일, 화면 또는 토지이용계획확인서 파일을 남기세요.',
    caution: '용도지역만으로 세차장 가능 여부를 확정하지 말고 관할 도시계획·건축 부서에 주소를 제시해 확인해야 합니다.',
  },
  '1-1': {
    kicker: '정부24',
    title: '건축물대장상 현재 용도 확인',
    description: '건축물대장에서 건물 전체와 실제 사용할 층·호의 현재 용도를 확인합니다.',
    links: [{ label: '정부24 건축물대장 열기', href: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000098&tp_seq=03' }],
    steps: [
      '후보지의 도로명주소와 지번, 건물 동·층·호를 준비합니다.',
      '정부24에서 건축물대장 등본(초본) 발급·열람 서비스를 엽니다.',
      '일반건축물인지 집합건축물인지 확인해 맞는 대장을 선택합니다.',
      '주용도와 층별개요에서 실제 사용할 공간의 용도를 찾습니다.',
    ],
    checks: ['건축물대장 종류', '건물의 주용도', '사용할 층·호의 용도와 면적'],
    record: '대장 종류, 주용도, 층·호별 용도·면적, 발급일과 파일명을 메모하세요.',
    caution: '대장에 적힌 현재 용도와 세차장으로 사용할 수 있는지는 별도 판단입니다. 용도변경 필요 여부를 건축사와 관할 건축 부서에 확인하세요.',
  },
  '1-2': {
    kicker: '정부24',
    title: '위반건축물 표시 여부 확인',
    description: '같은 건축물대장에서 위반건축물 표시와 변동사항을 함께 확인합니다.',
    links: [{ label: '정부24 건축물대장 열기', href: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000098&tp_seq=03' }],
    steps: [
      '후보지 주소로 최신 건축물대장을 열람하거나 발급합니다.',
      '대장 첫 화면의 위반건축물 표시 여부를 확인합니다.',
      '변동사항과 층별 현황에서 무단 증축·용도변경 관련 기록을 확인합니다.',
      '표시가 있거나 내용이 불명확하면 관할 건축 부서에 위반 내용과 해소 조건을 문의합니다.',
    ],
    checks: ['위반건축물 표시 유무', '위반 내용과 대상 공간', '해소 여부 또는 담당 부서 답변'],
    record: '표시 유무, 위반 내용, 담당 부서·담당자·답변일을 메모하세요.',
    caution: '위반 표시가 있으면 계약이나 공사를 먼저 진행하지 말고 해소 가능 여부와 책임 주체를 서면으로 확인하는 것이 안전합니다.',
  },
  '1-3': {
    kicker: '인터넷등기소',
    title: '건물과 토지의 소유자 확인',
    description: '토지와 건물의 등기사항증명서를 각각 확인해 계약 상대방과 소유자가 일치하는지 봅니다.',
    links: [{ label: '인터넷등기소 열기', href: 'https://www.iros.go.kr/' }],
    steps: [
      '후보지의 정확한 지번과 건물 주소를 준비합니다.',
      '인터넷등기소에서 부동산 등기 열람·발급 메뉴를 엽니다.',
      '토지와 건물을 각각 검색해 등기사항증명서를 열람합니다.',
      '소유권에 관한 사항에서 현재 소유자와 계약 상대방의 일치 여부를 확인합니다.',
    ],
    checks: ['토지 소유자', '건물 소유자', '임대인과 소유자의 일치 여부', '대리계약이면 위임장과 대리권'],
    record: '개인식별번호를 옮겨 적지 말고 소유자 일치·불일치, 발급일과 확인한 문서만 기록하세요.',
    caution: '등기 열람·발급에는 수수료나 인증 절차가 필요할 수 있습니다. 권리관계 해석이 필요하면 공인중개사나 법률 전문가에게 확인하세요.',
  },
  '1-7': {
    kicker: '토지이음',
    title: '지구단위계획·경관지구 등 행위제한 확인',
    description: '용도지역 외에 후보지에 겹쳐 지정된 계획·지구·구역과 관련 행위제한을 확인합니다.',
    links: [{ label: '토지이음 열기', href: 'https://www.eum.go.kr/web/am/amMain.jsp' }],
    steps: [
      '후보지 지번으로 토지이용계획을 엽니다.',
      '지역·지구등 지정여부에 지구단위계획구역, 경관지구 등 추가 지정이 있는지 확인합니다.',
      '관련 고시·도면·조례 연결 정보가 있으면 세차장·자동차 관련 시설의 제한 내용을 찾습니다.',
      '내용이 복잡하거나 자료가 연결되지 않으면 관할 도시계획·경관·건축 부서에 주소와 운영계획을 제시합니다.',
    ],
    checks: ['추가 지역·지구·구역 명칭', '관련 고시·계획·조례', '건축·용도·외관·진입 관련 제한'],
    record: '지정 명칭, 근거 고시·조례, 담당 부서 답변과 확인일을 메모하세요.',
    caution: '인터넷 열람 내용만으로 행위 가능 여부를 확정하지 말고 해당 계획을 담당하는 관할 부서의 답변을 남기세요.',
  },
  '1-15': {
    kicker: '서류 확보',
    title: '확인서·대장·등기사항증명서 확보',
    description: '검토 근거가 되는 세 가지 서류를 같은 후보지 폴더에 모아 최신 상태로 보관합니다.',
    links: [
      { label: '토지이음 열기', href: 'https://www.eum.go.kr/web/am/amMain.jsp' },
      { label: '정부24 열기', href: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=15000000098&tp_seq=03' },
      { label: '인터넷등기소 열기', href: 'https://www.iros.go.kr/' },
    ],
    steps: [
      '토지이음에서 토지이용계획확인서를 열람·발급하거나 화면을 저장합니다.',
      '정부24에서 후보지에 맞는 건축물대장을 열람·발급합니다.',
      '인터넷등기소에서 토지와 건물의 등기사항증명서를 확인합니다.',
      '세 문서의 주소·지번·동·층·호가 같은 후보지를 가리키는지 대조합니다.',
    ],
    checks: ['토지이용계획확인서', '건축물대장', '토지·건물 등기사항증명서', '문서 주소와 후보지의 일치 여부'],
    record: '후보지명_서류명_발급일 형식으로 저장하고, 메모에는 문서 확인일과 빠진 서류를 남기세요.',
    caution: '오래된 출력물이나 중개인이 전달한 사본만 믿지 말고 계약 직전에 최신 문서를 다시 확인하세요.',
  },
};
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
    const anchor = group.querySelector('.step-one-checklist') || group.querySelector('.guide-content');
    if (anchor) anchor.before(status);
  }
  const completed = boxes.filter((box) => box.checked).length;
  status.innerHTML = `<span>세부 체크</span><strong>${completed} / ${boxes.length}</strong>`;
  updateStepOneGroupProgress(group);
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
    washType: typeof seed.washType === 'string' ? seed.washType : '',
    bayCount: typeof seed.bayCount === 'string' ? seed.bayCount : '',
    consultationNotes: Array.isArray(seed.consultationNotes) ? seed.consultationNotes : [],
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

function stepOneCandidateMetrics(candidate) {
  const itemIds = [...document.querySelectorAll('[data-detail-check^="1-"]')]
    .map((box) => box.dataset.detailCheck);
  const itemIdSet = new Set(itemIds);
  const completed = candidate.detailChecks.filter((id) => itemIdSet.has(id)).length;
  const caution = Object.values(candidate.stepStatuses)
    .filter((status) => status === 'conditional' || status === 'blocked').length;
  return {
    completed,
    total: itemIds.length,
    unchecked: Math.max(itemIds.length - completed, 0),
    caution,
  };
}

function renderCandidatePanel(fields) {
  const active = getActiveCandidate();
  const list = fields.querySelector('[data-candidate-list]');
  list.innerHTML = candidateState.candidates.map((candidate, index) => {
    const selected = candidate.id === active.id;
    const metrics = stepOneCandidateMetrics(candidate);
    return `
      <button type="button" class="candidate-tab${selected ? ' active' : ''}" data-candidate-id="${escapeHtml(candidate.id)}" aria-current="${selected ? 'true' : 'false'}">
        <span class="candidate-card-head">
          <strong>${escapeHtml(candidateDisplayName(candidate, index))}</strong>
          ${selected ? '<em>현재 선택</em>' : ''}
        </span>
        <small class="candidate-card-address">${escapeHtml(candidate.address.trim() || '주소 미입력')}</small>
        <span class="candidate-card-status"><b>종합 상태</b><em>${candidateStatusLabels[candidate.status]}</em></span>
        <span class="candidate-card-metrics">
          <span><b>1단계 진행률</b><em>${metrics.completed} / ${metrics.total}</em></span>
          <span><b>미확인 항목</b><em>${metrics.unchecked}</em></span>
          <span><b>조건부·부적합</b><em>${metrics.caution}</em></span>
        </span>
      </button>
    `;
  }).join('');

  fields.querySelector('[data-candidate-field="name"]').value = active.name;
  fields.querySelector('[data-candidate-field="address"]').value = active.address;
  fields.querySelector('[data-candidate-field="status"]').value = active.status;
  fields.querySelector('[data-candidate-field="washType"]').value = active.washType;
  fields.querySelector('[data-candidate-field="bayCount"]').value = active.bayCount;
  const removeButton = fields.querySelector('[data-candidate-remove]');
  removeButton.disabled = candidateState.candidates.length === 1;
  removeButton.title = removeButton.disabled ? '후보지는 최소 1개가 필요합니다.' : '현재 후보지 삭제';
  globalThis.dispatchEvent(new CustomEvent('sonsecha:candidate-changed'));

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
    <ol class="candidate-quick-guide" aria-label="후보지 사전 확인 사용 순서">
      <li><span>1</span>후보지 이름과 주소 입력</li>
      <li><span>2</span>온라인 서류 확인</li>
      <li><span>3</span>현장 확인</li>
      <li><span>4</span>관할 부서 문의</li>
      <li><span>5</span>단계 판정 및 메모 저장</li>
    </ol>
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
    <label>
      <span>예상 세차장 형태</span>
      <input type="text" data-candidate-field="washType" placeholder="예: 손세차·디테일링 복합형">
    </label>
    <label>
      <span>예상 베이 수</span>
      <input type="text" data-candidate-field="bayCount" inputmode="numeric" placeholder="예: 3베이">
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
      renderCandidatePanel(fields);
      if (input.tagName !== 'SELECT') {
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
    const fields = document.querySelector('.candidate-fields');
    if (fields) renderCandidatePanel(fields);
  });
}

function organizeStepOneChecklist(group, scope) {
  if (scope !== '1') return;
  const guide = group.querySelector('.guide-content');
  if (!guide) return;
  const items = [...guide.querySelectorAll('li')];
  if (items.length !== stepOneCheckGroups.reduce((total, item) => total + item.itemIndexes.length, 0)) return;

  const checklist = document.createElement('div');
  checklist.className = 'step-one-checklist';
  checklist.setAttribute('aria-label', '1단계 세부 체크 묶음');

  stepOneCheckGroups.forEach((definition, index) => {
    const details = document.createElement('details');
    details.className = 'step-one-check-group';
    details.dataset.checkGroup = definition.id;
    details.open = index === 0;
    details.innerHTML = `
      <summary>
        <span class="check-group-copy">
          <strong>${definition.title}</strong>
          <small>${definition.description}</small>
        </span>
        <span class="check-group-progress" data-group-progress>0 / ${definition.itemIndexes.length}</span>
      </summary>
      ${definition.links?.length ? `
        <div class="online-check-links" aria-label="온라인 서류 확인 사이트">
          ${definition.links.map((link) => `
            <a href="${link.href}" target="_blank" rel="noopener noreferrer">
              <span><strong>${link.label}</strong><small>${link.detail}</small></span>
              <em>새 창 ↗</em>
            </a>
          `).join('')}
        </div>
      ` : ''}
      <ul class="check-group-items"></ul>
    `;
    const list = details.querySelector('.check-group-items');
    definition.itemIndexes.forEach((itemIndex) => list.append(items[itemIndex]));
    checklist.append(details);
  });

  guide.querySelectorAll('ul').forEach((list) => {
    if (!list.children.length) list.hidden = true;
  });

  const explanation = document.createElement('details');
  explanation.className = 'step-one-explanation';
  explanation.innerHTML = `
    <summary>
      <strong>설명 자료</strong>
      <span>필요할 때 펼치기</span>
    </summary>
  `;
  explanation.append(guide);

  group.append(checklist, explanation);
  const fields = group.querySelector('.candidate-fields');
  if (fields) group.prepend(fields);
}

function updateStepOneGroupProgress(group) {
  group.querySelectorAll('[data-check-group]').forEach((details) => {
    const boxes = [...details.querySelectorAll('input[data-detail-check]')];
    const completed = boxes.filter((box) => box.checked).length;
    const progress = details.querySelector('[data-group-progress]');
    if (progress) progress.textContent = `${completed} / ${boxes.length}`;
    details.classList.toggle('group-complete', boxes.length > 0 && completed === boxes.length);
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
      const usageGuide = onlineUsageGuides[id];
      item.classList.toggle('has-usage-help', Boolean(usageGuide));
      item.innerHTML = `
        <label class="detail-check-item">
          <input type="checkbox" data-detail-check="${id}">
          <span class="detail-checkmark" aria-hidden="true"></span>
          <span class="detail-check-copy">${original}</span>
        </label>
        ${usageGuide ? `<button type="button" class="detail-usage-button" data-usage-help="${id}">이용방법</button>` : ''}
        <div class="detail-note-wrap">
          <label for="note-${id}">이 항목 메모</label>
          <textarea id="note-${id}" class="detail-note" data-detail-note="${id}" placeholder="확인한 내용, 담당부서·담당자, 답변일과 근거를 적어두세요."></textarea>
          <span class="note-save-state" aria-live="polite">자동 저장</span>
        </div>
      `;
      const box = item.querySelector('input');
      const note = item.querySelector('[data-detail-note]');
      const usageButton = item.querySelector('[data-usage-help]');
      resizeNote(note);
      usageButton?.addEventListener('click', () => openUsageGuide(id, usageButton));
      box.addEventListener('change', () => {
        item.classList.toggle('checked', box.checked);
        item.classList.toggle('note-open', box.checked || Boolean(note.value));
        if (box.checked) setTimeout(() => note.focus(), 80);
        const activeChecks = [...document.querySelectorAll('input[data-detail-check]:checked')]
          .map((checked) => checked.dataset.detailCheck);
        getActiveCandidate().detailChecks = activeChecks;
        saveCandidateState();
        updateDetailGroup(group);
        const fields = document.querySelector('.candidate-fields');
        if (fields) renderCandidatePanel(fields);
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
    organizeStepOneChecklist(group, scope);
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
  const fields = document.querySelector('.candidate-fields');
  if (fields) renderCandidatePanel(fields);
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
  catalog: document.querySelector('#shopCatalogView'),
  detail: document.querySelector('#productDetailView'),
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
    details: String(product.details || ''),
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
  const detailHref = `#shop/product/${encodeURIComponent(product.id)}`;
  return `
    <article class="product-card" data-product-id="${escapeHtml(product.id)}">
      <a class="product-media" href="${detailHref}" data-product-detail="${escapeHtml(product.id)}" aria-label="${escapeHtml(product.name)} 상세 보기">
        ${media}
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
      </a>
      <div class="product-copy">
        <span class="product-category">${escapeHtml(categoryLabels.get(product.category) || '기타')}</span>
        <h3><a href="${detailHref}" data-product-detail="${escapeHtml(product.id)}">${escapeHtml(product.name)}</a></h3>
        <p>${escapeHtml(product.summary)}</p>
        <div class="product-buy-row">
          <strong>${formatPrice(product.price)}</strong>
          <div class="product-buy-actions">
            <a href="${detailHref}" data-product-detail="${escapeHtml(product.id)}">상세 보기</a>
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

function productDetailIdFromHash(hash = globalThis.location.hash) {
  const prefix = '#shop/product/';
  if (!hash.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(hash.slice(prefix.length));
  } catch {
    return '';
  }
}

function renderDetailParagraphs(value) {
  const text = String(value || '').trim();
  if (!text) return '<p>등록된 상세 설명이 없습니다. 제품 구성과 설치 조건은 상담 시 확인해 주세요.</p>';
  return text.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll('\n', '<br>')}</p>`).join('');
}

function renderProductDetail(productId) {
  const product = productById.get(productId);
  if (!product) {
    shopElements.detail.innerHTML = `
      <div class="product-detail-empty">
        <span aria-hidden="true">水</span>
        <p>PRODUCT NOT FOUND</p>
        <h1>공개 중인 상품을 찾을 수 없습니다.</h1>
        <small>비공개·삭제된 상품이거나 주소가 잘못됐을 수 있습니다.</small>
        <a href="#shop">제품 목록으로 돌아가기</a>
      </div>
    `;
    return;
  }
  const category = categoryLabels.get(product.category) || '기타';
  const detailText = product.details || product.summary;
  const related = catalogProducts
    .filter((item) => item.id !== product.id && item.category === product.category)
    .sort((a, b) => b.featured - a.featured)
    .slice(0, 3);
  const image = product.image
    ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">`
    : '<span class="product-detail-placeholder" aria-hidden="true">水</span>';
  shopElements.detail.innerHTML = `
    <div class="product-detail-breadcrumb" role="navigation" aria-label="상품 상세 경로">
      <a href="#shop">제품몰</a><span aria-hidden="true">/</span><strong>${escapeHtml(category)}</strong>
    </div>
    <section class="product-detail-hero" data-product-id="${escapeHtml(product.id)}">
      <div class="product-detail-media">
        ${image}
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ''}
      </div>
      <div class="product-detail-copy">
        <span class="product-category">${escapeHtml(category)}</span>
        <h1>${escapeHtml(product.name)}</h1>
        <p class="product-detail-summary">${escapeHtml(product.summary || '상품의 구성과 적용 조건을 상담으로 확인해 주세요.')}</p>
        <div class="product-detail-price">
          <span>판매가</span>
          <strong>${formatPrice(product.price)}</strong>
          <small class="${product.inStock ? 'available' : 'sold-out'}">${product.inStock ? '장바구니 판매 가능' : '현재 품절'}</small>
        </div>
        <div class="product-detail-actions">
          <button type="button" data-add-product="${escapeHtml(product.id)}"${product.inStock ? '' : ' disabled'}>${product.inStock ? '장바구니 담기' : '품절 상품'}</button>
          ${product.shopUrl ? `<a href="${escapeHtml(product.shopUrl)}" target="_blank" rel="noopener noreferrer" data-analytics-id="product:official:${escapeHtml(product.id)}" data-analytics-label="공식몰에서 ${escapeHtml(product.name)} 보기">공식몰에서 보기 ↗</a>` : '<a href="tel:03116887759">전화로 문의하기</a>'}
        </div>
        <p class="product-detail-caution">배송비·설치비·재고와 현장 적용 가능 여부는 최종 상담에서 확정됩니다.</p>
      </div>
    </section>
    <section class="product-detail-description">
      <header><p>PRODUCT INFORMATION</p><h2>상품 상세 안내</h2></header>
      <div>${renderDetailParagraphs(detailText)}</div>
    </section>
    <section class="product-detail-guide">
      <article><span>01</span><strong>현장 조건 확인</strong><p>전기·급수·배수와 설치 공간을 먼저 확인해 주세요.</p></article>
      <article><span>02</span><strong>견적서 작성</strong><p>장바구니에 수량을 담아 간이견적서를 만들 수 있습니다.</p></article>
      <article><span>03</span><strong>최종 상담</strong><p>배송·설치·재고 조건은 전화 상담에서 확정합니다.</p></article>
    </section>
    ${related.length ? `<section class="product-related"><header><p>RELATED PRODUCTS</p><h2>같은 분류 상품</h2></header><div>${related.map((item) => `<a href="#shop/product/${encodeURIComponent(item.id)}" data-product-detail="${escapeHtml(item.id)}"><span>${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : '水'}</span><b>${escapeHtml(item.name)}</b><small>${formatPrice(item.price)}</small></a>`).join('')}</div></section>` : ''}
    <a class="product-detail-back" href="#shop">← 제품 목록으로 돌아가기</a>
  `;
}

function renderShopRoute(productId) {
  const detailOpen = productId !== null;
  shopElements.catalog.hidden = detailOpen;
  shopElements.detail.hidden = !detailOpen;
  if (detailOpen) renderProductDetail(productId);
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
  shopElements.detail.addEventListener('click', (event) => {
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
  syncSiteView();
}

function syncSiteView() {
  const productId = productDetailIdFromHash();
  const isShopView = globalThis.location.hash === '#shop' || productId !== null;
  document.body.classList.toggle('shop-view', isShopView);
  document.body.classList.toggle('guide-view', !isShopView);
  document.querySelectorAll('[data-view-tab]').forEach((tab) => {
    const active = tab.dataset.viewTab === (isShopView ? 'shop' : 'guide');
    tab.classList.toggle('active', active);
    if (active) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  renderShopRoute(productId);
  const detailProduct = productId === null ? null : productById.get(productId);
  document.title = detailProduct
    ? `${detailProduct.name} · 손세차장 제품몰`
    : isShopView
      ? '제품몰 · 손세차장 창업 로드맵'
    : '손세차장 창업 로드맵';
  if (isShopView) requestAnimationFrame(() => globalThis.scrollTo({ top: 0, behavior: 'auto' }));
}

const feedbackElements = {
  open: document.querySelector('#feedbackOpenButton'),
  modal: document.querySelector('#feedbackModal'),
  backdrop: document.querySelector('.feedback-backdrop'),
  form: document.querySelector('#feedbackForm'),
  submit: document.querySelector('#feedbackSubmitButton'),
  status: document.querySelector('#feedbackFormStatus'),
};

const usageGuideElements = {
  modal: document.querySelector('#usageGuideModal'),
  backdrop: document.querySelector('.usage-guide-backdrop'),
  close: document.querySelector('#usageGuideCloseButton'),
  kicker: document.querySelector('#usageGuideKicker'),
  title: document.querySelector('#usageGuideTitle'),
  description: document.querySelector('#usageGuideDescription'),
  links: document.querySelector('#usageGuideLinks'),
  steps: document.querySelector('#usageGuideSteps'),
  checks: document.querySelector('#usageGuideChecks'),
  record: document.querySelector('#usageGuideRecord'),
  caution: document.querySelector('#usageGuideCaution'),
};
let lastUsageGuideTrigger;

function openUsageGuide(id, trigger) {
  const guide = onlineUsageGuides[id];
  if (!guide) return;
  lastUsageGuideTrigger = trigger;
  usageGuideElements.kicker.textContent = guide.kicker;
  usageGuideElements.title.textContent = guide.title;
  usageGuideElements.description.textContent = guide.description;
  usageGuideElements.links.innerHTML = guide.links.map((link) => `
    <a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} <span>↗</span></a>
  `).join('');
  usageGuideElements.steps.innerHTML = guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  usageGuideElements.checks.innerHTML = guide.checks.map((check) => `<li>${escapeHtml(check)}</li>`).join('');
  usageGuideElements.record.textContent = guide.record;
  usageGuideElements.caution.textContent = guide.caution;
  usageGuideElements.backdrop.hidden = false;
  usageGuideElements.modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('usage-guide-open');
  requestAnimationFrame(() => {
    usageGuideElements.backdrop.classList.add('visible');
    usageGuideElements.modal.classList.add('open');
    usageGuideElements.close.focus();
  });
}

function closeUsageGuide() {
  if (!usageGuideElements.modal.classList.contains('open')) return;
  usageGuideElements.modal.classList.remove('open');
  usageGuideElements.backdrop.classList.remove('visible');
  usageGuideElements.modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('usage-guide-open');
  setTimeout(() => { usageGuideElements.backdrop.hidden = true; }, 220);
  lastUsageGuideTrigger?.focus();
}

document.querySelectorAll('[data-usage-guide-close]').forEach((button) => button.addEventListener('click', closeUsageGuide));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeUsageGuide();
});

function feedbackDeviceType() {
  if (globalThis.matchMedia('(max-width: 600px)').matches) return 'mobile';
  if (globalThis.matchMedia('(max-width: 1024px)').matches) return 'tablet';
  return 'desktop';
}

function suggestedFeedbackArea() {
  if (document.body.classList.contains('quote-open') || document.body.classList.contains('cart-open')) return '장바구니·견적';
  if (globalThis.location.hash === '#shop') return '제품몰';
  const center = document.elementFromPoint(globalThis.innerWidth / 2, globalThis.innerHeight / 2);
  if (center?.closest('#roadmap')) return '12단계 절차';
  if (center?.closest('#field-guide')) return '후보지 체크';
  return '창업가이드';
}

function openFeedback() {
  feedbackElements.form.elements.area.value = suggestedFeedbackArea();
  feedbackElements.status.textContent = '';
  feedbackElements.backdrop.hidden = false;
  feedbackElements.modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('feedback-open');
  requestAnimationFrame(() => {
    feedbackElements.backdrop.classList.add('visible');
    feedbackElements.modal.classList.add('open');
    feedbackElements.form.elements.message.focus();
  });
}

function closeFeedback() {
  feedbackElements.modal.classList.remove('open');
  feedbackElements.backdrop.classList.remove('visible');
  feedbackElements.modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('feedback-open');
  setTimeout(() => { feedbackElements.backdrop.hidden = true; }, 220);
  feedbackElements.open.focus();
}

async function submitFeedback(event) {
  event.preventDefault();
  if (!feedbackElements.form.reportValidity()) return;
  const fields = feedbackElements.form.elements;
  feedbackElements.submit.disabled = true;
  feedbackElements.status.textContent = '우리 서버에 저장하는 중…';
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: fields.kind.value,
        area: fields.area.value,
        message: fields.message.value,
        website: fields.website.value,
        page: `${globalThis.location.pathname}${globalThis.location.hash}`,
        device: feedbackDeviceType(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || '의견을 저장하지 못했습니다.');
    feedbackElements.form.reset();
    feedbackElements.status.textContent = '고맙습니다. 의견을 안전하게 저장했습니다.';
    feedbackElements.submit.textContent = '저장 완료';
    setTimeout(closeFeedback, 1200);
  } catch (error) {
    feedbackElements.status.textContent = error.message;
  } finally {
    feedbackElements.submit.disabled = false;
    setTimeout(() => { feedbackElements.submit.textContent = '의견 보내기'; }, 1400);
  }
}

feedbackElements.open.addEventListener('click', openFeedback);
document.querySelectorAll('[data-feedback-close]').forEach((button) => button.addEventListener('click', closeFeedback));
feedbackElements.form.addEventListener('submit', submitFeedback);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && feedbackElements.modal.classList.contains('open')) closeFeedback();
});

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
  const fields = document.querySelector('.candidate-fields');
  if (fields) renderCandidatePanel(fields);
  updateProgress();
});

document.querySelector('#printButton').addEventListener('click', () => window.print());
globalThis.addEventListener('hashchange', syncSiteView);
syncSiteView();
installClickAnalytics();
initializeSiteContent();
hydrateGuide();
candidateState = loadCandidateState();
saveCandidateState();
hydrateDetailChecks();
loadCandidateData();
initializeConsultations({
  getState: () => candidateState,
  getActiveCandidate,
  saveCandidateState,
  candidateDisplayName: (candidate) => candidateDisplayName(
    candidate,
    candidateState.candidates.findIndex((item) => item.id === candidate.id),
  ),
});
const firstStepCard = document.querySelector('input[data-step="1"]')?.closest('.step-card');
const activeCandidate = getActiveCandidate();
if (
  firstStepCard
  && !activeCandidate.name
  && !activeCandidate.address
  && !activeCandidate.detailChecks.length
  && !activeCandidate.stepChecks.length
) {
  firstStepCard.classList.add('detail-open');
  const toggle = firstStepCard.querySelector('.detail-toggle');
  if (toggle) {
    toggle.textContent = '−';
    toggle.setAttribute('aria-expanded', 'true');
  }
}
initializeShop();
