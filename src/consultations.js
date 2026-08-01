const recordStorageKey = 'sonsecha-consultations-v1';
const statusLabels = {
  received: '접수', reviewing: '확인 중', more_info: '추가자료 요청',
  answered: '답변 완료', connected: '상담 연결', closed: '종료',
};
const candidateStatusLabels = {
  unreviewed: '미확인', possible: '가능', conditional: '조건부 가능', blocked: '불가',
};

function stepStatusText(completed, status) {
  return `${completed ? '진행 완료' : '진행 미완료'} · 판정 ${candidateStatusLabels[status] || '미확인'}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function readRecords() {
  try {
    const value = JSON.parse(localStorage.getItem(recordStorageKey) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

function saveRecords(records) {
  localStorage.setItem(recordStorageKey, JSON.stringify(records));
}

function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sonsecha-consultation-photos', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('photos', { keyPath: 'id' });
      store.createIndex('candidateId', 'candidateId');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function photoTransaction(mode, action) {
  const database = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('photos', mode);
    const result = action(transaction.objectStore('photos'));
    transaction.oncomplete = () => { database.close(); resolve(result?.result); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

async function saveLocalPhoto(candidateId, file) {
  const id = `${candidateId}:${crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`}`;
  await photoTransaction('readwrite', (store) => store.put({ id, candidateId, name: file.name, type: file.type, blob: file, createdAt: new Date().toISOString() }));
}

async function listLocalPhotos(candidateId) {
  const database = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('photos', 'readonly');
    const request = transaction.objectStore('photos').index('candidateId').getAll(candidateId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function deleteLocalPhoto(id) {
  await photoTransaction('readwrite', (store) => store.delete(id));
}

async function request(path, options = {}, key = '') {
  const response = await fetch(path, {
    cache: 'no-store', credentials: 'same-origin', ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(key ? { 'x-consultation-key': key } : {}),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

async function imagePayload(photo) {
  const bitmap = await createImageBitmap(photo.blob, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d', { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  if (!blob) throw new Error('사진을 변환하지 못했습니다.');
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { name: photo.name.replace(/\.[^.]+$/, '') + '.webp', mime: 'image/webp', data };
}

export function initializeConsultations({ getState, getActiveCandidate, saveCandidateState, candidateDisplayName }) {
  const panel = document.querySelector('.candidate-fields');
  if (!panel) return;
  let photoItems = [];
  let photoSelection = new Map();
  let currentRecord = null;
  let selectedCandidateIds = new Set();
  let draftQuestion = '';

  const actions = document.createElement('div');
  actions.className = 'consultation-actions';
  actions.innerHTML = `
    <button type="button" class="consultation-create" data-consultation-create>후보지 검토 요청서 작성</button>
    <button type="button" class="consultation-history" data-consultation-history>상태·대화 보기</button>
    <div class="consultation-candidate-status" data-consultation-status></div>
    <details class="consultation-saved-notes" data-consultation-notes></details>
  `;
  panel.append(actions);

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'consultation-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-label', '상담 창 닫기');
  const modal = document.createElement('section');
  modal.className = 'consultation-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'consultationTitle');
  modal.innerHTML = `
    <header class="consultation-modal-header">
      <div><p>CANDIDATE REVIEW REQUEST</p><h2 id="consultationTitle">후보지 검토 요청서</h2><span>선택하고 확인한 자료만 대한이엔지에 전달됩니다.</span></div>
      <button type="button" data-consultation-close aria-label="닫기">×</button>
    </header>
    <div class="consultation-body" data-consultation-body></div>
  `;
  document.body.append(backdrop, modal);
  const body = modal.querySelector('[data-consultation-body]');

  function recordsForActive() {
    const records = readRecords();
    return Array.isArray(records[getActiveCandidate().id]) ? records[getActiveCandidate().id] : [];
  }

  function latestRecord() { return recordsForActive().at(-1) || null; }

  function renderPanel() {
    const record = latestRecord();
    actions.querySelector('[data-consultation-history]').disabled = !record;
    actions.querySelector('[data-consultation-status]').innerHTML = record
      ? `<span>최근 접수</span><strong>${escapeHtml(record.receipt)}</strong><em>${escapeHtml(statusLabels[record.status] || record.status || '접수')}</em>`
      : '<span>아직 전송한 상담자료가 없습니다.</span>';
    const notes = Array.isArray(getActiveCandidate().consultationNotes) ? getActiveCandidate().consultationNotes : [];
    const noteBox = actions.querySelector('[data-consultation-notes]');
    noteBox.hidden = !notes.length;
    noteBox.innerHTML = notes.length ? `<summary>상담 답변 메모 · ${notes.length}개</summary><div>${notes.map((note) => `
      <article><small>${escapeHtml(note.source)} · ${escapeHtml(note.receipt)} · ${formatDate(note.addedAt)}</small><strong>${escapeHtml(note.contextLabel)}</strong><p>${escapeHtml(note.text)}</p></article>
    `).join('')}</div>` : '';
  }

  function openModal() {
    backdrop.hidden = false;
    modal.hidden = false;
    document.body.classList.add('consultation-open');
    requestAnimationFrame(() => { backdrop.classList.add('visible'); modal.classList.add('open'); });
  }

  function closeModal() {
    modal.classList.remove('open');
    backdrop.classList.remove('visible');
    document.body.classList.remove('consultation-open');
    setTimeout(() => { modal.hidden = true; backdrop.hidden = true; }, 220);
  }

  function snapshotCandidates(snapshot) {
    return Array.isArray(snapshot?.candidates) ? snapshot.candidates : [snapshot || {}];
  }

  function recordCandidateIds(record) {
    return Array.isArray(record?.candidateIds) && record.candidateIds.length
      ? record.candidateIds : [record?.candidateId].filter(Boolean);
  }

  function syncCurrentRecord() {
    if (!currentRecord?.receipt) return;
    const records = readRecords();
    recordCandidateIds(currentRecord).forEach((candidateId) => {
      const stored = (records[candidateId] || []).find((item) => item.receipt === currentRecord.receipt);
      if (stored) Object.assign(stored, currentRecord);
    });
    saveRecords(records);
  }

  function candidateSnapshot(candidate, form) {
    const sharing = {
      address: form.elements.shareAddress.checked,
      plan: form.elements.sharePlan.checked,
      notes: form.elements.shareNotes.checked,
      photos: form.elements.sharePhotos.checked
        && photoItems.some((item) => item.candidateId === candidate.id && item.selected),
    };
    const steps = [...document.querySelectorAll('.step-card')].map((card) => {
      const id = card.querySelector('input[data-step]')?.dataset.step || '';
      return {
        id,
        label: card.querySelector('h3')?.textContent.trim() || `${id}단계`,
        completed: (candidate.stepChecks || []).includes(id),
        status: candidate.stepStatuses?.[id] || 'unreviewed',
      };
    });
    const checks = [...document.querySelectorAll('input[data-detail-check]')].map((box) => ({
      id: box.dataset.detailCheck,
      step: box.dataset.detailCheck.split('-')[0],
      label: box.closest('li')?.querySelector('.detail-check-copy')?.textContent.trim() || box.dataset.detailCheck,
      completed: (candidate.detailChecks || []).includes(box.dataset.detailCheck),
    }));
    const notes = sharing.notes ? Object.entries(candidate.detailNotes || {}).filter(([, text]) => String(text).trim()).map(([id, text]) => ({
      id,
      step: checks.find((item) => item.id === id)?.step || id.split('-')[0],
      label: checks.find((item) => item.id === id)?.label || id,
      text,
    })) : [];
    const completed = checks.filter((item) => item.completed).length;
    return {
      candidateRef: candidate.id,
      candidateName: candidateDisplayName(candidate),
      address: sharing.address ? candidate.address : '',
      plan: sharing.plan ? { washType: candidate.washType || '', bayCount: candidate.bayCount || '' } : null,
      overallStatus: candidate.status,
      progress: { completed, total: checks.length, unchecked: checks.length - completed },
      steps,
      checks,
      notes,
      sharing,
    };
  }

  function snapshotFromForm(form) {
    const candidates = getState().candidates
      .filter((candidate) => selectedCandidateIds.has(candidate.id))
      .map((candidate) => candidateSnapshot(candidate, form));
    const completed = candidates.reduce((sum, candidate) => sum + candidate.progress.completed, 0);
    const total = candidates.reduce((sum, candidate) => sum + candidate.progress.total, 0);
    return {
      version: 2,
      candidates,
      candidateCount: candidates.length,
      progress: { completed, total, unchecked: Math.max(0, total - completed) },
      sharing: {
        address: form.elements.shareAddress.checked,
        plan: form.elements.sharePlan.checked,
        notes: form.elements.shareNotes.checked,
        photos: form.elements.sharePhotos.checked && photoItems.some((item) => item.selected),
      },
    };
  }

  function selectedPhotoMarkup() {
    if (!photoItems.length) return '<p class="consultation-empty">선택한 사진이 없습니다.</p>';
    return photoItems.map((photo) => `
      <article class="consultation-photo${photo.selected ? ' selected' : ''}" data-photo-id="${escapeHtml(photo.id)}">
        <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.name)} 미리보기">
        <label><input type="checkbox" data-photo-select ${photo.selected ? 'checked' : ''}><span>전송 선택</span></label>
        <button type="button" data-photo-remove>삭제</button>
        <b>${escapeHtml(photo.candidateName || '후보지')}</b>
        <small>${escapeHtml(photo.name)}</small>
      </article>
    `).join('');
  }

  async function renderCreate() {
    const candidates = getState().candidates;
    if (!selectedCandidateIds.size || !candidates.some((candidate) => selectedCandidateIds.has(candidate.id))) {
      selectedCandidateIds = new Set([getActiveCandidate().id]);
    }
    selectedCandidateIds = new Set(candidates.filter((candidate) => selectedCandidateIds.has(candidate.id)).map((candidate) => candidate.id));
    const refreshPhotos = async () => {
      photoItems.forEach((item) => URL.revokeObjectURL(item.url));
      const groups = await Promise.all(candidates.filter((candidate) => selectedCandidateIds.has(candidate.id)).map(async (candidate) => {
        const items = await listLocalPhotos(candidate.id).catch(() => []);
        return items.map((item) => {
          const selected = photoSelection.has(item.id) ? photoSelection.get(item.id) : true;
          photoSelection.set(item.id, selected);
          return { ...item, candidateName: candidateDisplayName(candidate), url: URL.createObjectURL(item.blob), selected };
        });
      }));
      photoItems = groups.flat();
    };
    await refreshPhotos();
    const selectedCandidates = candidates.filter((candidate) => selectedCandidateIds.has(candidate.id));
    const notesCount = selectedCandidates.reduce((sum, candidate) => sum + Object.values(candidate.detailNotes || {}).filter((text) => String(text).trim()).length, 0);
    body.innerHTML = `
      <form class="consultation-share-form" data-consultation-form>
        <nav class="consultation-steps" aria-label="상담자료 만들기 순서"><strong>1. 공유 선택</strong><span>2. 미리보기</span><span>3. 동의·전송</span></nav>
        <fieldset class="consultation-candidate-picker"><legend>검토받을 후보지 선택 <b data-selected-count>${selectedCandidates.length}곳</b></legend>
          <label class="candidate-select-all"><input type="checkbox" data-candidate-all ${selectedCandidates.length === candidates.length ? 'checked' : ''}><span><strong>전체 후보지 선택</strong><small>선택한 후보지를 한 접수번호로 함께 비교·검토합니다.</small></span></label>
          <div data-candidate-list>${candidates.map((candidate) => `<label class="consultation-candidate-choice${selectedCandidateIds.has(candidate.id) ? ' selected' : ''}"><input type="checkbox" value="${escapeHtml(candidate.id)}" data-candidate-select ${selectedCandidateIds.has(candidate.id) ? 'checked' : ''}><span><strong>${escapeHtml(candidateDisplayName(candidate))}</strong><small>${escapeHtml(candidate.address || '주소 미입력')} · 12단계 ${(candidate.stepChecks || []).length}/12</small></span></label>`).join('')}</div>
        </fieldset>
        <fieldset class="consultation-options"><legend>공유할 정보</legend>
          <label><input type="checkbox" name="shareAddress"><span><strong>주소</strong><small>선택해야만 서버로 전송됩니다.</small></span></label>
          <label><input type="checkbox" name="sharePlan"><span><strong>세차장 형태·베이 수</strong><small>선택 후보지별 입력 내용을 공유합니다.</small></span></label>
          <label class="consultation-notes-option"><input type="checkbox" name="shareNotes"><span><strong>1~12단계 메모·담당기관 문의 기록</strong><small data-share-notes-count>작성된 단계별 메모 ${notesCount}개 · 선택하면 단계별로 묶어 요청서에 전달됩니다.</small></span></label>
          <label><input type="checkbox" name="sharePhotos"><span><strong>선택 사진</strong><small>아래에서 사진별로 다시 선택합니다.</small></span></label>
        </fieldset>
        <section class="consultation-stage-review">
          <header><div><strong>1~12단계 기록 확인</strong><span>관리자가 다시 묻지 않도록 단계별 판정과 작성 메모를 전송 전에 확인하세요.</span></div><b data-stage-share-state>메모 공유 선택 필요</b></header>
          <div data-stage-review></div>
        </section>
        <section class="consultation-photo-picker">
          <div><strong>사진 선택</strong><span>JPG·PNG·WebP, 원본 10MB 이하, 후보지별 최대 10장</span></div>
          <label class="consultation-photo-target"><span>사진을 저장할 후보지</span><select data-photo-candidate>${selectedCandidates.map((candidate) => `<option value="${escapeHtml(candidate.id)}">${escapeHtml(candidateDisplayName(candidate))}</option>`).join('')}</select></label>
          <label class="consultation-file-button">+ 사진 고르기<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-photo-input></label>
          <p class="photo-privacy-warning">사람 얼굴·차량번호가 보이지 않는지 확인하세요. 전송본은 브라우저에서 다시 생성해 EXIF 위치정보를 제거합니다.</p>
          <div class="consultation-photo-grid" data-photo-grid>${selectedPhotoMarkup()}</div>
        </section>
        <label class="consultation-question"><span>상담 질문 *</span><textarea name="question" maxlength="3000" rows="5" required placeholder="후보지에서 가장 먼저 검토받고 싶은 내용을 적어주세요.">${escapeHtml(draftQuestion)}</textarea></label>
        <div class="consultation-footer"><p data-consultation-feedback></p><button type="submit">전송 내용 미리보기</button></div>
      </form>
    `;
    const form = body.querySelector('[data-consultation-form]');
    const grid = form.querySelector('[data-photo-grid]');
    const rerenderPhotos = () => { grid.innerHTML = selectedPhotoMarkup(); };
    const renderStageReview = () => {
      const stepDefinitions = [...document.querySelectorAll('.step-card')].map((card) => {
        const id = card.querySelector('input[data-step]')?.dataset.step || '';
        return { id, label: card.querySelector('h3')?.textContent.trim() || `${id}단계` };
      });
      const checkLabels = new Map([...document.querySelectorAll('input[data-detail-check]')].map((box) => [
        box.dataset.detailCheck,
        box.closest('li')?.querySelector('.detail-check-copy')?.textContent.trim() || box.dataset.detailCheck,
      ]));
      const selected = candidates.filter((candidate) => selectedCandidateIds.has(candidate.id));
      const noteSharing = form.elements.shareNotes.checked;
      const totalNotes = selected.reduce((sum, candidate) => sum + Object.values(candidate.detailNotes || {}).filter((text) => String(text).trim()).length, 0);
      form.querySelector('[data-share-notes-count]').textContent = `작성된 단계별 메모 ${totalNotes}개 · 선택하면 단계별로 묶어 요청서에 전달됩니다.`;
      const shareState = form.querySelector('[data-stage-share-state]');
      shareState.textContent = noteSharing ? `메모 ${totalNotes}개 요청서 포함` : '메모 공유 선택 필요';
      shareState.classList.toggle('included', noteSharing);
      form.querySelector('[data-stage-review]').innerHTML = selected.map((candidate, candidateIndex) => {
        const notes = Object.entries(candidate.detailNotes || {}).filter(([, text]) => String(text).trim()).map(([id, text]) => ({
          id, step: id.split('-')[0], label: checkLabels.get(id) || id, text,
        }));
        return `<details class="consultation-stage-candidate"${candidateIndex === 0 ? ' open' : ''}><summary><span><strong>${escapeHtml(candidateDisplayName(candidate))}</strong><small>12단계 ${(candidate.stepChecks || []).length}/12 · 메모 ${notes.length}개</small></span><b>${noteSharing ? '전송 포함' : '메모 제외'}</b></summary><div>${stepDefinitions.map((step) => {
          const stepNotes = notes.filter((note) => note.step === step.id);
          const completed = (candidate.stepChecks || []).includes(step.id);
          const status = stepStatusText(completed, candidate.stepStatuses?.[step.id] || 'unreviewed');
          return `<article><header><span>${escapeHtml(step.id)}단계 · ${escapeHtml(step.label)}</span><b>${escapeHtml(status)}</b></header><section>${stepNotes.map((note) => `<p><strong>${escapeHtml(note.label)}</strong><span>${escapeHtml(note.text)}</span></p>`).join('') || '<em>작성된 메모 없음</em>'}</section></article>`;
        }).join('')}</div></details>`;
      }).join('') || '<p class="consultation-empty">검토받을 후보지를 선택해 주세요.</p>';
    };
    const renderPhotoTargets = () => {
      const selected = candidates.filter((candidate) => selectedCandidateIds.has(candidate.id));
      form.querySelector('[data-photo-candidate]').innerHTML = selected.map((candidate) => `<option value="${escapeHtml(candidate.id)}">${escapeHtml(candidateDisplayName(candidate))}</option>`).join('');
      form.querySelector('[data-selected-count]').textContent = `${selected.length}곳`;
      form.querySelector('[data-candidate-all]').checked = selected.length === candidates.length;
    };
    form.querySelector('[data-candidate-list]').addEventListener('change', async (event) => {
      const input = event.target.closest('[data-candidate-select]');
      if (!input) return;
      input.closest('label').classList.toggle('selected', input.checked);
      selectedCandidateIds = new Set([...form.querySelectorAll('[data-candidate-select]:checked')].map((box) => box.value));
      renderPhotoTargets();
      await refreshPhotos();
      rerenderPhotos();
      renderStageReview();
    });
    form.querySelector('[data-candidate-all]').addEventListener('change', async (event) => {
      form.querySelectorAll('[data-candidate-select]').forEach((box) => {
        box.checked = event.target.checked;
        box.closest('label').classList.toggle('selected', box.checked);
      });
      selectedCandidateIds = new Set(event.target.checked ? candidates.map((candidate) => candidate.id) : []);
      renderPhotoTargets();
      await refreshPhotos();
      rerenderPhotos();
      renderStageReview();
    });
    form.elements.shareNotes.addEventListener('change', renderStageReview);
    renderStageReview();
    form.querySelector('[data-photo-input]').addEventListener('change', async (event) => {
      const feedback = form.querySelector('[data-consultation-feedback]');
      const files = [...event.target.files];
      const candidateId = form.querySelector('[data-photo-candidate]').value;
      if (!candidateId) { feedback.textContent = '사진을 저장할 후보지를 먼저 선택해 주세요.'; return; }
      if (photoItems.filter((item) => item.candidateId === candidateId).length + files.length > 10) { feedback.textContent = '사진은 후보지별 최대 10장까지 선택할 수 있습니다.'; return; }
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10_000_000) {
          feedback.textContent = `${file.name}: 형식 또는 10MB 용량 제한을 확인해 주세요.`;
          continue;
        }
        await saveLocalPhoto(candidateId, file);
      }
      await refreshPhotos();
      rerenderPhotos();
      event.target.value = '';
    });
    grid.addEventListener('change', (event) => {
      const card = event.target.closest('[data-photo-id]');
      const photo = photoItems.find((item) => item.id === card?.dataset.photoId);
      if (photo) {
        photo.selected = event.target.checked;
        photoSelection.set(photo.id, photo.selected);
      }
      card?.classList.toggle('selected', Boolean(event.target.checked));
    });
    grid.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-photo-remove]');
      const card = button?.closest('[data-photo-id]');
      if (!card) return;
      const photo = photoItems.find((item) => item.id === card.dataset.photoId);
      if (photo) URL.revokeObjectURL(photo.url);
      await deleteLocalPhoto(card.dataset.photoId);
      photoSelection.delete(card.dataset.photoId);
      photoItems = photoItems.filter((item) => item.id !== card.dataset.photoId);
      rerenderPhotos();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      draftQuestion = form.elements.question.value;
      if (!selectedCandidateIds.size) {
        form.querySelector('[data-consultation-feedback]').textContent = '검토받을 후보지를 한 곳 이상 선택해 주세요.';
        return;
      }
      if (form.elements.sharePhotos.checked && !photoItems.some((item) => item.selected)) {
        form.querySelector('[data-consultation-feedback]').textContent = '사진 공유를 선택했다면 전송할 사진을 한 장 이상 골라주세요.';
        return;
      }
      renderPreview(snapshotFromForm(form), form.elements.question.value);
    });
  }

  function renderPreview(snapshot, question, showPhotoChoices = snapshot.sharing?.photos === true) {
    const candidates = snapshotCandidates(snapshot);
    const previewPhotos = showPhotoChoices
      ? photoItems.filter((photo) => candidates.some((candidate) => candidate.candidateRef === photo.candidateId))
      : [];
    const selectedPhotos = photoItems.filter((photo) => photo.selected
      && candidates.some((candidate) => candidate.candidateRef === photo.candidateId && candidate.sharing?.photos));
    body.innerHTML = `
      <div class="consultation-preview">
        <nav class="consultation-steps" aria-label="상담자료 만들기 순서"><span>1. 공유 선택</span><strong>2. 미리보기</strong><span>3. 동의·전송</span></nav>
        <section class="consultation-bundle-summary"><span>한 건으로 접수할 후보지</span><strong>${candidates.length}곳</strong><small>각 후보지의 12단계 자료는 서로 분리되어 전달됩니다.</small></section>
        ${candidates.map((candidate, index) => {
          const unconfirmed = candidate.checks.filter((item) => !item.completed);
          return `<section class="consultation-candidate-preview">
            <div class="preview-card"><span>후보지 ${index + 1}</span><h3>${escapeHtml(candidate.candidateName)}</h3>
              ${candidate.sharing.address ? `<p>${escapeHtml(candidate.address || '주소 미입력')}</p>` : '<p>주소 공유 안 함</p>'}
              <dl><div><dt>세부 진행률</dt><dd>${candidate.progress.completed} / ${candidate.progress.total}</dd></div><div><dt>종합 상태</dt><dd>${escapeHtml(candidateStatusLabels[candidate.overallStatus])}</dd></div><div><dt>미확인</dt><dd>${candidate.progress.unchecked}개</dd></div></dl>
            </div>
            <div class="preview-exclude-actions">
              ${candidate.sharing.address ? `<button type="button" data-preview-exclude="address" data-candidate-ref="${escapeHtml(candidate.candidateRef)}">주소 제외</button>` : ''}
              ${candidate.sharing.plan ? `<button type="button" data-preview-exclude="plan" data-candidate-ref="${escapeHtml(candidate.candidateRef)}">형태·베이 제외</button>` : ''}
              ${candidate.sharing.notes ? `<button type="button" data-preview-exclude="notes" data-candidate-ref="${escapeHtml(candidate.candidateRef)}">단계별 메모 제외</button>` : ''}
            </div>
            ${candidate.plan ? `<div class="preview-block"><h3>예상 형태</h3><p>${escapeHtml(candidate.plan.washType || '미입력')} · ${escapeHtml(candidate.plan.bayCount || '베이 수 미입력')}</p></div>` : ''}
            <details class="preview-block" open><summary>12단계 상태·메모 · ${candidate.steps.length}단계 / 메모 ${candidate.notes.length}개</summary><ul class="step-note-preview">${candidate.steps.map((step) => {
              const stepNotes = candidate.notes.filter((note) => note.step === step.id);
              return `<li><div><span>${escapeHtml(step.label)}</span><b>${escapeHtml(stepStatusText(step.completed, step.status))}</b></div>${candidate.sharing.notes ? `<section>${stepNotes.map((note) => `<p><strong>${escapeHtml(note.label)}</strong><span>${escapeHtml(note.text)}</span></p>`).join('') || '<em>작성된 메모 없음</em>'}</section>` : '<section><em>메모 공유 안 함</em></section>'}</li>`;
            }).join('')}</ul></details>
            <details class="preview-block"><summary>미확인 세부항목 · ${unconfirmed.length}개</summary><ul>${unconfirmed.map((item) => `<li>${escapeHtml(item.label)}</li>`).join('') || '<li>없음</li>'}</ul></details>
            ${candidate.sharing.notes ? `<details class="preview-block"><summary>공유 메모 · ${candidate.notes.length}개</summary><ul>${candidate.notes.map((note) => `<li><strong>${escapeHtml(note.label)}</strong><p>${escapeHtml(note.text)}</p></li>`).join('') || '<li>작성된 메모 없음</li>'}</ul></details>` : ''}
          </section>`;
        }).join('')}
        <section class="preview-block"><h3>선택 사진 · ${selectedPhotos.length}장</h3><div class="consultation-photo-grid">${previewPhotos.map((photo) => `<article class="consultation-photo${photo.selected ? ' selected' : ''}" data-preview-photo-id="${escapeHtml(photo.id)}"><img src="${escapeHtml(photo.url)}" alt=""><label><input type="checkbox" data-preview-photo ${photo.selected ? 'checked' : ''}><span>${photo.selected ? '전송 포함' : '전송 제외'}</span></label><b>${escapeHtml(photo.candidateName)}</b><small>${escapeHtml(photo.name)}</small></article>`).join('') || '<p class="consultation-empty">사진 공유 안 함</p>'}</div></section>
        <section class="preview-block"><h3>상담 질문</h3><p>${escapeHtml(question)}</p></section>
        <label class="consultation-consent"><input type="checkbox" data-consent><span>선택한 후보지 정보, 진행상태, 메모와 사진을 대한이엔지에 전달하는 것에 동의합니다.</span></label>
        <p class="consultation-send-status" data-send-status></p>
        <div class="consultation-footer"><button type="button" class="secondary" data-preview-back>다시 선택</button><button type="button" data-send>동의 후 전송</button></div>
      </div>
    `;
    body.querySelector('[data-preview-back]').addEventListener('click', renderCreate);
    body.querySelectorAll('[data-preview-exclude]').forEach((button) => {
      button.addEventListener('click', () => {
        const candidate = candidates.find((item) => item.candidateRef === button.dataset.candidateRef);
        const field = button.dataset.previewExclude;
        if (!candidate || !['address', 'plan', 'notes'].includes(field)) return;
        candidate.sharing[field] = false;
        if (field === 'address') candidate.address = '';
        if (field === 'plan') candidate.plan = null;
        if (field === 'notes') candidate.notes = [];
        snapshot.sharing[field] = candidates.some((item) => item.sharing?.[field]);
        renderPreview(snapshot, question, showPhotoChoices);
      });
    });
    body.querySelectorAll('[data-preview-photo]').forEach((input) => {
      input.addEventListener('change', () => {
        const card = input.closest('[data-preview-photo-id]');
        const photo = photoItems.find((item) => item.id === card?.dataset.previewPhotoId);
        if (!photo) return;
        photo.selected = input.checked;
        photoSelection.set(photo.id, photo.selected);
        candidates.forEach((candidate) => {
          candidate.sharing.photos = photoItems.some((item) => item.candidateId === candidate.candidateRef && item.selected);
        });
        snapshot.sharing.photos = candidates.some((candidate) => candidate.sharing.photos);
        renderPreview(snapshot, question, true);
      });
    });
    body.querySelector('[data-send]').addEventListener('click', async (event) => {
      const consent = body.querySelector('[data-consent]');
      const status = body.querySelector('[data-send-status]');
      if (!consent.checked) { status.textContent = '공유 동의 체크 후 전송할 수 있습니다.'; consent.focus(); return; }
      event.target.disabled = true;
      status.textContent = '상담 건을 접수하는 중…';
      try {
        const candidateIds = candidates.map((candidate) => candidate.candidateRef);
        const payload = await request('/api/consultations', {
          method: 'POST',
          body: JSON.stringify({ clientCandidateRefs: candidateIds, snapshot, question, consent: true }),
        });
        const record = {
          receipt: payload.consultation.receipt,
          accessKey: payload.accessKey,
          candidateId: candidateIds[0],
          candidateIds,
          status: payload.consultation.status,
          createdAt: payload.consultation.createdAt,
          pendingPhotoIds: selectedPhotos.map((photo) => photo.id),
        };
        const records = readRecords();
        candidateIds.forEach((candidateId) => {
          records[candidateId] = [...(Array.isArray(records[candidateId]) ? records[candidateId] : []), record];
        });
        saveRecords(records);
        currentRecord = record;
        const pendingPhotoIds = new Set(record.pendingPhotoIds);
        const failures = [];
        for (let index = 0; index < selectedPhotos.length; index += 1) {
          status.textContent = `접수 완료 · 사진 ${index + 1}/${selectedPhotos.length} 전송 중…`;
          try {
            const photoPayload = { ...(await imagePayload(selectedPhotos[index])), candidateRef: selectedPhotos[index].candidateId };
            await request(`/api/consultations/${record.receipt}/photos`, { method: 'POST', body: JSON.stringify(photoPayload) }, record.accessKey);
            await deleteLocalPhoto(selectedPhotos[index].id);
            photoSelection.delete(selectedPhotos[index].id);
            pendingPhotoIds.delete(selectedPhotos[index].id);
          } catch (error) { failures.push(`${selectedPhotos[index].candidateName} · ${selectedPhotos[index].name}: ${error.message}`); }
        }
        currentRecord.pendingPhotoIds = [...pendingPhotoIds];
        syncCurrentRecord();
        const refreshed = await request(`/api/consultations/${record.receipt}`, {}, record.accessKey);
        renderConversation(refreshed.consultation, failures);
        renderPanel();
      } catch (error) {
        status.textContent = error.message;
        event.target.disabled = false;
      }
    });
  }

  function replyTargetCandidate(message) {
    const candidateIds = recordCandidateIds(currentRecord);
    const contextCandidateId = String(message.contextId || '').includes(':')
      ? String(message.contextId).split(':')[0] : '';
    const activeId = getActiveCandidate().id;
    const targetId = candidateIds.includes(contextCandidateId)
      ? contextCandidateId : candidateIds.includes(activeId) ? activeId : candidateIds[0];
    return getState().candidates.find((candidate) => candidate.id === targetId);
  }

  function saveReplyToCandidate(message) {
    const candidate = replyTargetCandidate(message);
    if (!candidate) return false;
    candidate.consultationNotes = Array.isArray(candidate.consultationNotes) ? candidate.consultationNotes : [];
    if (candidate.consultationNotes.some((item) => item.sourceMessageId === message.id)) return false;
    candidate.consultationNotes.push({
      id: crypto.randomUUID?.() || `memo-${Date.now()}`,
      source: '대한이엔지 상담 답변', sourceMessageId: message.id, receipt: currentRecord.receipt,
      contextLabel: message.contextLabel || '전체 상담', text: message.body, createdAt: message.createdAt,
      addedAt: new Date().toISOString(),
    });
    saveCandidateState();
    renderPanel();
    return true;
  }

  function renderConversation(consultation, uploadFailures = []) {
    currentRecord.status = consultation.status;
    syncCurrentRecord();
    const adminMessages = consultation.messages.filter((message) => message.sender === 'admin');
    const candidates = snapshotCandidates(consultation.snapshot);
    const candidateNameById = new Map(candidates.map((candidate) => [candidate.candidateRef, candidate.candidateName]));
    const replyApplied = (message) => (replyTargetCandidate(message)?.consultationNotes || [])
      .some((item) => item.sourceMessageId === message.id);
    body.innerHTML = `
      <div class="consultation-room">
        <nav class="consultation-steps"><strong>접수 ${escapeHtml(consultation.receipt)}</strong><span>${escapeHtml(statusLabels[consultation.status] || consultation.status)}</span></nav>
        <section class="receipt-card"><span>접수번호</span><strong>${escapeHtml(consultation.receipt)}</strong><small>${formatDate(consultation.createdAt)} · 새로고침 후에도 이 기기에서 확인 가능</small></section>
        ${uploadFailures.length || currentRecord.pendingPhotoIds?.length ? `<div class="upload-failures"><strong>사진 전송 대기 · ${currentRecord.pendingPhotoIds?.length || 0}장</strong><p>${uploadFailures.length ? uploadFailures.map(escapeHtml).join('<br>') : '이 기기에 남아 있는 실패 사진만 다시 전송합니다.'}</p><button type="button" data-retry-photos>실패 사진 재시도</button></div>` : ''}
        ${consultation.attachments.length ? `<section class="shared-photo-list"><strong>전송된 사진 · ${consultation.attachments.length}장</strong><div>${consultation.attachments.map((photo) => `<article data-shared-photo="${photo.id}"><span>${escapeHtml(candidateNameById.get(photo.candidateRef) || '후보지')} · ${escapeHtml(photo.name)}</span><small>${Math.max(1, Math.round(photo.size / 1024)).toLocaleString('ko-KR')}KB</small><button type="button" data-delete-shared-photo>첨부 삭제</button></article>`).join('')}</div></section>` : ''}
        <div class="conversation-list" data-message-list>
          <article class="message admin"><small>접수 안내 · ${formatDate(consultation.createdAt)}</small><p>상담 요청이 접수됐습니다. 이 대화방에서 검토 상태와 답변을 확인할 수 있습니다.</p></article>
          ${consultation.messages.map((message) => `
            <article class="message ${escapeHtml(message.sender)}" data-message-id="${message.id}">
              <small>${message.sender === 'admin' ? '대한이엔지' : '사용자'}${message.contextLabel ? ` · ${escapeHtml(message.contextLabel)}` : ''} · ${formatDate(message.createdAt)}</small>
              <p>${escapeHtml(message.body)}</p>
              ${message.sender === 'admin' ? `<button type="button" data-apply-reply="${message.id}" ${replyApplied(message) ? 'disabled' : ''}>${replyApplied(message) ? '후보지 메모에 반영됨' : '답변을 후보지 메모에 반영'}</button>` : ''}
            </article>
          `).join('')}
        </div>
        <form class="conversation-form" data-message-form><label><span>추가 질문</span><textarea name="body" maxlength="4000" rows="3" required placeholder="추가로 확인할 내용을 남겨주세요."></textarea></label><button type="submit">메시지 보내기</button><p data-message-status></p></form>
        ${adminMessages.length ? `<p class="conversation-seen">관리자 답변 ${adminMessages.length}개 · 후보지 메모에는 사용자가 선택한 답변만 추가됩니다.</p>` : ''}
      </div>
    `;
    request(`/api/consultations/${currentRecord.receipt}/seen`, { method: 'POST', body: '{}' }, currentRecord.accessKey).catch(() => {});
    body.querySelector('[data-message-list]').addEventListener('click', (event) => {
      const button = event.target.closest('[data-apply-reply]');
      if (!button) return;
      const message = consultation.messages.find((item) => item.id === Number(button.dataset.applyReply));
      if (message && saveReplyToCandidate(message)) { button.disabled = true; button.textContent = '후보지 메모에 반영됨'; }
    });
    body.querySelector('[data-message-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const status = form.querySelector('[data-message-status]');
      const button = form.querySelector('button');
      button.disabled = true;
      status.textContent = '전송 중…';
      try {
        const payload = await request(`/api/consultations/${currentRecord.receipt}/messages`, {
          method: 'POST', body: JSON.stringify({ body: form.elements.body.value }),
        }, currentRecord.accessKey);
        renderConversation(payload.consultation);
      } catch (error) { status.textContent = error.message; button.disabled = false; }
    });
    body.querySelector('[data-retry-photos]')?.addEventListener('click', async () => {
      const pendingIds = new Set(currentRecord.pendingPhotoIds || []);
      const pendingGroups = await Promise.all(recordCandidateIds(currentRecord).map(async (candidateId) => {
        const items = await listLocalPhotos(candidateId);
        const candidate = getState().candidates.find((item) => item.id === candidateId);
        return items.filter((item) => pendingIds.has(item.id)).map((item) => ({ ...item, candidateName: candidate ? candidateDisplayName(candidate) : '후보지', selected: true }));
      }));
      const pending = pendingGroups.flat();
      const failures = [];
      for (const photo of pending) {
        try {
          await request(`/api/consultations/${currentRecord.receipt}/photos`, { method: 'POST', body: JSON.stringify({ ...(await imagePayload(photo)), candidateRef: photo.candidateId }) }, currentRecord.accessKey);
          await deleteLocalPhoto(photo.id);
          pendingIds.delete(photo.id);
        } catch (error) { failures.push(`${photo.candidateName} · ${photo.name}: ${error.message}`); }
      }
      currentRecord.pendingPhotoIds = [...pendingIds];
      syncCurrentRecord();
      const refreshed = await request(`/api/consultations/${currentRecord.receipt}`, {}, currentRecord.accessKey);
      renderConversation(refreshed.consultation, failures);
    });
    body.querySelector('.shared-photo-list')?.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-delete-shared-photo]');
      const photo = button?.closest('[data-shared-photo]');
      if (!photo || !globalThis.confirm('전송된 첨부사진을 이 상담 건에서 삭제할까요?')) return;
      button.disabled = true;
      try {
        await request(`/api/consultations/${currentRecord.receipt}/photos/${photo.dataset.sharedPhoto}`, { method: 'DELETE' }, currentRecord.accessKey);
        const refreshed = await request(`/api/consultations/${currentRecord.receipt}`, {}, currentRecord.accessKey);
        renderConversation(refreshed.consultation);
      } catch (error) { globalThis.alert(error.message); button.disabled = false; }
    });
  }

  async function openHistory() {
    currentRecord = latestRecord();
    if (!currentRecord) return;
    openModal();
    body.innerHTML = '<p class="consultation-loading">상담 상태와 대화를 불러오는 중…</p>';
    try {
      const payload = await request(`/api/consultations/${currentRecord.receipt}`, {}, currentRecord.accessKey);
      renderConversation(payload.consultation);
      renderPanel();
    } catch (error) { body.innerHTML = `<p class="consultation-error">${escapeHtml(error.message)}</p>`; }
  }

  async function startCreate() {
    selectedCandidateIds = new Set([getActiveCandidate().id]);
    photoSelection = new Map();
    draftQuestion = '';
    openModal();
    await renderCreate();
  }
  actions.querySelector('[data-consultation-create]').addEventListener('click', startCreate);
  document.querySelector('#consultationRequestButton')?.addEventListener('click', startCreate);
  actions.querySelector('[data-consultation-history]').addEventListener('click', openHistory);
  backdrop.addEventListener('click', closeModal);
  modal.querySelector('[data-consultation-close]').addEventListener('click', closeModal);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
  window.addEventListener('sonsecha:candidate-changed', renderPanel);
  renderPanel();
}
