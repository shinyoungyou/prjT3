'use strict';

// Admin Landing Page:
//   Welcome to Team prjT3, Secret: "<secret>", Time: <browser date and time>

(async () => {
  await window.sessionReady;

  const welcome = document.getElementById('welcome');
  const res = await api('/api/secret');
  if (res.status === 401) {
    location.replace('index.html');
    return;
  }
  if (!res.ok) {
    welcome.textContent = 'Could not load the secret. Please refresh.';
    return;
  }

  const { team, secret } = res.data;
  const render = () => {
    // Time comes from the browser's own clock, as the assignment requires.
    const time = new Date().toLocaleString();
    welcome.textContent = `Welcome to Team ${team}, Secret: "${secret}", Time: ${time}`;
  };
  render();
  setInterval(render, 1000);
})();
