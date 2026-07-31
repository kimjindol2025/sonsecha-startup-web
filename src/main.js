import guideMarkdown from '../README.md?raw';

const checkboxes = [...document.querySelectorAll('input[data-step]')];
const progressText = document.querySelector('#progressText');
const progressBar = document.querySelector('#progressBar');
const storageKey = 'sonsecha-roadmap-progress';
const detailStorageKey = 'sonsecha-detail-checks-v1';

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

function hydrateDetailChecks() {
  const saved = new Set(JSON.parse(localStorage.getItem(detailStorageKey) || '[]'));
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
      `;
      const box = item.querySelector('input');
      box.checked = saved.has(id);
      item.classList.toggle('checked', box.checked);
      box.addEventListener('change', () => {
        item.classList.toggle('checked', box.checked);
        const active = [...document.querySelectorAll('input[data-detail-check]:checked')]
          .map((checked) => checked.dataset.detailCheck);
        localStorage.setItem(detailStorageKey, JSON.stringify(active));
        updateDetailGroup(group);
      });
    });
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
  localStorage.removeItem(detailStorageKey);
  document.querySelectorAll('.step-detail, .field-panel').forEach(updateDetailGroup);
  updateProgress();
});

document.querySelector('#printButton').addEventListener('click', () => window.print());
hydrateGuide();
hydrateDetailChecks();
loadProgress();
