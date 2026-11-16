'use strict';

const store = require('../store');
const { requireAuth } = require('../auth');
const { limitPasswordAttempts } = require('../rateLimit');
const { HttpError, sendJson, readJson, requireAllowedOrigin } = require('../http');

module.exports = (route) => {
  // POST /prjT3/api/settings
  //   { "currentPassword": "...", "newPassword": "...", "newSecret": "..." }
  // newPassword and newSecret are each optional, but at least one is needed.
  route('POST', '/api/settings', async (req, res) => {
    requireAllowedOrigin(req);
    requireAuth(req);
    // This endpoint checks a password too, so it shares the login limits.
    limitPasswordAttempts(req);

    const { currentPassword, newPassword, newSecret } = await readJson(req);

    if (typeof currentPassword !== 'string' || currentPassword.length === 0 || currentPassword.length > 64) {
      throw new HttpError(400, 'currentPassword is required');
    }
    if (newPassword === undefined && newSecret === undefined) {
      throw new HttpError(400, 'Provide newPassword and/or newSecret');
    }
    // Hackathon rule: password is at most six characters.
    if (newPassword !== undefined && (typeof newPassword !== 'string' || !/^\S{1,6}$/.test(newPassword))) {
      throw new HttpError(400, 'New password must be 1 to 6 characters with no spaces');
    }
    // Hackathon rule: secret is fewer than 20 characters with no spaces.
    if (newSecret !== undefined && (typeof newSecret !== 'string' || !/^\S{1,19}$/.test(newSecret))) {
      throw new HttpError(400, 'New secret must be 1 to 19 characters with no spaces');
    }

    // Re-authentication: a valid cookie alone is not enough to change
    // credentials. The caller must also know the current password.
    // 403 (not 401) so the frontend shows an error instead of logging out.
    if (!(await store.checkPassword(currentPassword))) {
      throw new HttpError(403, 'Current password is incorrect');
    }

    await store.update({ newPassword, newSecret });
    sendJson(res, 200, {
      ok: true,
      passwordChanged: newPassword !== undefined,
      secretChanged: newSecret !== undefined,
    });
  });
};
