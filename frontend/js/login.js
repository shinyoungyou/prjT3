'use strict';

const form = document.getElementById('login-form');
const message = document.getElementById('message');
const button = document.getElementById('login-button');

document.getElementById('team').textContent = window.CONFIG.TEAM;

// Already logged in? Skip the form.
api('/api/me')
  .then((res) => {
    if (res.ok) location.replace('admin.html');
  })
  .catch(() => {});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  message.hidden = true;
  try {
    const res = await api('/api/login', {
      method: 'POST',
      body: {
        username: form.username.value,
        password: form.password.value,
      },
    });
    if (res.ok) {
      location.replace('admin.html');
      return;
    }
    const fallback = res.status === 429 ? 'Too many attempts. Please wait a minute.' : 'Login failed.';
    showMessage(message, (res.data && res.data.error) || fallback, 'error');
  } catch {
    showMessage(message, 'Cannot reach the server. Please try again.', 'error');
  }
  form.password.value = '';
  button.disabled = false;
});
