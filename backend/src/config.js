'use strict';

// All tunable values live here and come from environment variables,
// so nothing sensitive is hard-coded in the repository.

const path = require('node:path');
const crypto = require('node:crypto');

const env = process.env;
const isHosted = env.NODE_ENV === 'production' || Boolean(env.RENDER);

// The JWT signing key is NOT the "secret" shown on the admin page.
// It must be long, random, and stable across restarts: if it changed,
// previously issued JWTs would stop verifying, which the rules forbid.
if (isHosted && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET (32+ random characters) must be set when hosted');
}
if (!env.JWT_SECRET) {
  console.warn('[config] JWT_SECRET not set: using a random key for this run only');
}

const team = env.TEAM || 'prjT3';

module.exports = {
  port: Number(env.PORT) || 3000,
  team,
  // Every API URL starts with the team number, e.g. /prjT3/api/login
  basePath: `/${team}`,

  // Exact origins allowed to call this API with cookies (comma separated).
  // For GitHub Pages this is https://<user>.github.io (no path, no slash).
  frontendOrigins: (env.FRONTEND_ORIGIN || 'http://localhost:5500')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  jwtSecret: env.JWT_SECRET || crypto.randomBytes(48).toString('hex'),
  // Rule: JWT and cookie must live at least 2 hours. 3 hours gives margin.
  tokenTtlSeconds: 3 * 60 * 60,
  cookieName: 'token',
  // Secure is required for SameSite=None. Only disable for plain-http testing.
  cookieSecure: env.COOKIE_SECURE !== 'false',

  username: 'admin',
  initialPassword: env.INITIAL_PASSWORD || 'BCIT12',
  initialSecret: env.INITIAL_SECRET || 'defaultSecret',
  dataFile: env.DATA_FILE || path.join(__dirname, '..', 'data', 'state.json'),

  // Password-guess throttling (login and settings share these counters).
  loginPerIpPerMinute: Number(env.LOGIN_PER_IP_PER_MIN) || 30,
  loginGlobalPerMinute: Number(env.LOGIN_GLOBAL_PER_MIN) || 120,
  maxConcurrentHashes: 4,
  maxBodyBytes: 1024,
};
