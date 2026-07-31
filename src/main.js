import guideMarkdown from '../README.md?raw';

const checkboxes = [...document.querySelectorAll('input[data-step]')];
const progressText = document.querySelector('#progressText');
const progressBar = document.querySelector('#progressBar');
const storageKey = 'sonsecha-roadmap-progress';
const detailStorageKey = 'sonsecha-detail-checks-v1';
const detailNotesStorageKey = 'sonsecha-detail-notes-v1';
const candidateStorageKey = 'sonsecha-candidate-v1';

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderInline(value) {
  return escapeHtml(value)
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

function resizeNote(note) {
  note.style.height = 'auto';
  note.style.height = `${Math.max(note.scrollHeight, 72)}px`;
}

function injectCandidateFields(group) {
  if (!group.closest('.step-card')?.querySelector('input[data-step="1"]')) return;
  const saved = readStoredObject(candidateStorageKey);
  const fields = document.createElement('div');
  fields.className = 'candidate-fields';
  fields.innerHTML = `
    <div class="candidate-heading">
      <span>MY CANDIDATE</span>
      <strong>검토할 후보지</strong>
      <small>입력 내용은 이 브라우저에 자동 저장됩니다.</small>
    </div>
    <label>
      <span>후보지 이름</span>
      <input type="text" data-candidate-field="name" placeholder="예: 후보지 1" value="${escapeHtml(saved.name || '')}">
    </label>
    <label class="address-field">
      <span>도로명주소 · 지번</span>
      <input type="text" data-candidate-field="address" placeholder="예: 서울시 ○○구 ○○로 12 / ○○동 123-4" value="${escapeHtml(saved.address || '')}">
    </label>
    <p class="local-save-state" aria-live="polite">이 기기에 저장됨</p>
  `;
  const guide = group.querySelector('.guide-content');
  if (guide) guide.before(fields);

  fields.querySelectorAll('[data-candidate-field]').forEach((input) => {
    input.addEventListener('input', () => {
      const values = {};
      fields.querySelectorAll('[data-candidate-field]').forEach((field) => {
        values[field.dataset.candidateField] = field.value;
      });
      localStorage.setItem(candidateStorageKey, JSON.stringify(values));
      const state = fields.querySelector('.local-save-state');
      state.textContent = '저장됨 ✓';
      clearTimeout(input.saveTimer);
      input.saveTimer = setTimeout(() => { state.textContent = '이 기기에 저장됨'; }, 1200);
    });
  });
}

function hydrateDetailChecks() {
  const saved = new Set(JSON.parse(localStorage.getItem(detailStorageKey) || '[]'));
  const savedNotes = readStoredObject(detailNotesStorageKey);
  const groups = [...document.querySelectorAll('.step-detail, .field-panel')];

  groups.forEach((group, groupIndex) => {
    const scope = group.closest('.step-card')?.querySelector('input[data-step]')?.dataset.step
      || group.id
      || `field-${groupIndex}`;

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
          <textarea id="note-${id}" class="detail-note" data-detail-note="${id}" placeholder="확인한 내용, 담당자 답변, 날짜 등을 적어두세요.">${escapeHtml(savedNotes[id] || '')}</textarea>
          <span class="note-save-state" aria-live="polite">자동 저장</span>
        </div>
      `;
      const box = item.querySelector('input');
      const note = item.querySelector('[data-detail-note]');
      box.checked = saved.has(id);
      item.classList.toggle('checked', box.checked);
      item.classList.toggle('note-open', box.checked || Boolean(note.value));
      resizeNote(note);
      box.addEventListener('change', () => {
        item.classList.toggle('checked', box.checked);
        item.classList.toggle('note-open', box.checked || Boolean(note.value));
        if (box.checked) setTimeout(() => note.focus(), 80);
        const active = [...document.querySelectorAll('input[data-detail-check]:checked')]
          .map((checked) => checked.dataset.detailCheck);
        localStorage.setItem(detailStorageKey, JSON.stringify(active));
        updateDetailGroup(group);
      });
      note.addEventListener('input', () => {
        const notes = readStoredObject(detailNotesStorageKey);
        if (note.value.trim()) notes[id] = note.value;
        else delete notes[id];
        localStorage.setItem(detailNotesStorageKey, JSON.stringify(notes));
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

function loadProgress() {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
  checkboxes.forEach((box) => {
    box.checked = saved.includes(box.dataset.step);
    box.closest('.step-card').classList.toggle('completed', box.checked);
  });
  updateProgress();
}

function updateProgress() {
  const completed = checkboxes.filter((box) => box.checked).length;
  progressText.textContent = `${completed} / ${checkboxes.length}`;
  progressBar.style.width = `${(completed / checkboxes.length) * 100}%`;
  localStorage.setItem(
    storageKey,
    JSON.stringify(checkboxes.filter((box) => box.checked).map((box) => box.dataset.step)),
  );
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
  document.querySelectorAll('[data-candidate-field]').forEach((field) => { field.value = ''; });
  localStorage.removeItem(detailStorageKey);
  localStorage.removeItem(detailNotesStorageKey);
  localStorage.removeItem(candidateStorageKey);
  document.querySelectorAll('.step-detail, .field-panel').forEach(updateDetailGroup);
  updateProgress();
});

document.querySelector('#printButton').addEventListener('click', () => window.print());
hydrateGuide();
hydrateDetailChecks();
loadProgress();
