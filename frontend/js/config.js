'use strict';

// The ONLY file to edit when deploying.
// API_BASE is the Render URL of the backend plus the team path, no trailing slash.
window.CONFIG = {
  TEAM: 'prjT3',
  API_BASE:
    location.hostname === 'localhost' || location.hostname === '127.0.0.1'
      ? 'http://localhost:3000/prjT3'
      : 'https://prjt3-api.onrender.com/prjT3',
};
