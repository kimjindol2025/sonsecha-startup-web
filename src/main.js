import guideMarkdown from '../README.md?raw';

const checkboxes = [...document.querySelectorAll('input[data-step]')];
const progressText = document.querySelector('#progressText');
const progressBar = document.querySelector('#progressBar');
const storageKey = 'sonsecha-roadmap-progress';
const detailStorageKey = 'sonsecha-detail-checks-v1';
const detailNotesStorageKey = 'sonsecha-detail-notes-v1';
const legacyCandidateStorageKey = 'sonsecha-candidate-v1';
const candidateStorageKey = 'sonsecha-candidates-v2';
let candidateState;

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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
hydrateGuide();
candidateState = loadCandidateState();
saveCandidateState();
hydrateDetailChecks();
loadCandidateData();
