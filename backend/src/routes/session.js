'use strict';

const config = require('../config');
const store = require('../store');
const { requireAuth, endSession } = require('../auth');
const { sendJson, requireAllowedOrigin } = require('../http');

module.exports = (route) => {
  // Used by every protected page to ask "am I logged in?".
  route('GET', '/api/me', (req, res) => {
    const claims = requireAuth(req);
    sendJson(res, 200, { team: config.team, user: claims.sub, expiresAt: claims.exp });
  });

  // The secret only ever leaves the server through this JWT-protected route.
  route('GET', '/api/secret', async (req, res) => {
    requireAuth(req);
    sendJson(res, 200, { team: config.team, secret: await store.getSecret() });
  });

  // Deletes the browser's cookie. The JWT itself is not revoked (rule 2).
  route('POST', '/api/logout', (req, res) => {
    requireAllowedOrigin(req);
    endSession(res);
    sendJson(res, 200, { ok: true });
  });
};
