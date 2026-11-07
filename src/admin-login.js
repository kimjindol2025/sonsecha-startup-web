const form = document.querySelector('#loginForm');
const password = document.querySelector('#adminPassword');
const submit = document.querySelector('#loginSubmit');
const feedback = document.querySelector('#loginFeedback');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  submit.disabled = true;
  feedback.textContent = '';
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-admin-request': '1' },
      body: JSON.stringify({ password: password.value }),
    });
    const result = await response.json();
    if (!response.ok || !result.authenticated) throw new Error(result.error || '로그인하지 못했습니다.');
    password.value = '';
    location.replace('/admin.html');
  } catch (error) {
    feedback.textContent = error.message || '관리자 서버에 연결할 수 없습니다.';
    password.value = '';
    password.focus();
  } finally {
    submit.disabled = false;
  }
});
