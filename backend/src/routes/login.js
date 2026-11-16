'use strict';

const config = require('../config');
const store = require('../store');
const { startSession } = require('../auth');
const { limitPasswordAttempts } = require('../rateLimit');
const { HttpError, sendJson, readJson, requireAllowedOrigin } = require('../http');

module.exports = (route) => {
  // Hash the initial password at startup rather than on the first login.
  store.load().catch((err) => console.error('[store] failed to load:', err));

  // POST /prjT3/api/login  { "username": "...", "password": "..." }
  route('POST', '/api/login', async (req, res) => {
    requireAllowedOrigin(req);
    limitPasswordAttempts(req);

    const { username, password } = await readJson(req);
    if (
      typeof username !== 'string' || typeof password !== 'string' ||
      username.length === 0 || password.length === 0 ||
      username.length > 64 || password.length > 64
    ) {
      throw new HttpError(400, 'username and password are required');
    }

    if (!(await store.checkLogin(username, password))) {
      // Same message for a wrong username or a wrong password.
      throw new HttpError(401, 'Invalid username or password');
    }

    startSession(res); // signed JWT in an HttpOnly cookie
    sendJson(res, 200, { ok: true, team: config.team });
  });
};
