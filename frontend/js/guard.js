'use strict';

// Loaded by every protected page.
//
// The page body starts hidden. We ask the API whether the HttpOnly cookie
// holds a valid JWT. Only the server can answer that, because JavaScript
// cannot read the cookie. If the answer is 401 we go to the login page.
//
// Hiding the page here is only for a clean user experience. The real
// protection is on the server: the secret is never sent without a valid JWT.

window.sessionReady = (async () => {
  let res;
  try {
    res = await api('/api/me');
  } catch {
    document.body.hidden = false;
    document.querySelector('main').textContent =
      'Cannot reach the server. Please refresh in a moment.';
    return new Promise(() => {}); // stop page scripts from continuing
  }
  if (!res.ok) {
    location.replace('index.html');
    return new Promise(() => {});
  }
  document.body.hidden = false;
  return res.data;
})();

document.getElementById('logout').addEventListener('click', async () => {
  try {
    await api('/api/logout', { method: 'POST' }); // server clears the cookie
  } catch {
    // Even if the request fails, leave the protected area.
  }
  location.replace('index.html');
});
