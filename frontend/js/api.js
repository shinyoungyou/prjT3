'use strict';

// One wrapper for every API call.
// credentials: 'include' tells the browser to send and accept the HttpOnly
// cookie on this cross-origin request. JavaScript never sees the JWT itself.
async function api(path, { method = 'GET', body } = {}) {
  const options = { method, credentials: 'include' };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(window.CONFIG.API_BASE + path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response: leave data as null.
  }
  return { ok: res.ok, status: res.status, data };
}

function showMessage(element, text, kind) {
  element.textContent = text; // textContent, never innerHTML: no HTML injection
  element.className = `message ${kind}`;
  element.hidden = false;
}
