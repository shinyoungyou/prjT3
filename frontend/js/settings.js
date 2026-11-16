'use strict';

// Phase 2: change the password and/or the secret.
// The server asks for the current password again, so a valid cookie alone
// is not enough to change credentials.

const form = document.getElementById('settings-form');
const message = document.getElementById('message');
const button = document.getElementById('save-button');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.hidden = true;

  const body = { currentPassword: form.currentPassword.value };
  if (form.newPassword.value) body.newPassword = form.newPassword.value;
  if (form.newSecret.value) body.newSecret = form.newSecret.value;

  if (!body.newPassword && !body.newSecret) {
    showMessage(message, 'Enter a new password and/or a new secret.', 'error');
    return;
  }

  button.disabled = true;
  try {
    const res = await api('/api/settings', { method: 'POST', body });
    if (res.status === 401) {
      location.replace('index.html');
      return;
    }
    if (res.ok) {
      const changed = [];
      if (res.data.passwordChanged) changed.push('password');
      if (res.data.secretChanged) changed.push('secret');
      showMessage(message, `Saved: ${changed.join(' and ')} updated.`, 'success');
      form.reset();
    } else {
      showMessage(message, (res.data && res.data.error) || 'Could not save changes.', 'error');
    }
  } catch {
    showMessage(message, 'Cannot reach the server. Please try again.', 'error');
  }
  button.disabled = false;
});
