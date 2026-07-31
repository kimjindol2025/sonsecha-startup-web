const checkboxes = [...document.querySelectorAll('input[data-step]')];
const progressText = document.querySelector('#progressText');
const progressBar = document.querySelector('#progressBar');
const storageKey = 'sonsecha-roadmap-progress';

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
  updateProgress();
});

document.querySelector('#printButton').addEventListener('click', () => window.print());
loadProgress();
