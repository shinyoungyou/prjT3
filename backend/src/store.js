'use strict';

// Holds the admin password hash and the current secret.
// Kept in memory for speed and written to a JSON file so a restart keeps
// the Phase 2 changes (as long as the host keeps the file: see README).

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
const password = require('./password');

let state = null; // { password: { salt, hash }, secret }

function persist() {
  try {
    fs.mkdirSync(path.dirname(config.dataFile), { recursive: true });
    const tmp = `${config.dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
    fs.renameSync(tmp, config.dataFile); // atomic: never a half-written file
  } catch (err) {
    console.error('[store] could not save state to disk:', err.message);
  }
}

async function load() {
  if (state) return state;
  try {
    const saved = JSON.parse(fs.readFileSync(config.dataFile, 'utf8'));
    if (saved.password && saved.password.salt && saved.password.hash && typeof saved.secret === 'string') {
      state = saved;
      console.log('[store] loaded saved credentials');
      return state;
    }
  } catch {
    // No saved state yet: fall through to the initial values.
  }
  state = {
    password: await password.hash(config.initialPassword),
    secret: config.initialSecret,
  };
  persist();
  console.log('[store] initialised with default credentials');
  return state;
}

// Constant-time string comparison that does not leak the length.
function sameString(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

async function checkPassword(candidate) {
  const current = await load();
  return password.verify(candidate, current.password);
}

async function checkLogin(username, candidate) {
  // Always do the slow password check, even for a wrong username, so the
  // response time does not reveal which part was wrong.
  const passwordOk = await checkPassword(candidate);
  return sameString(username, config.username) && passwordOk;
}

async function getSecret() {
  return (await load()).secret;
}

async function update({ newPassword, newSecret }) {
  const current = await load();
  const next = { ...current };
  if (newPassword !== undefined) next.password = await password.hash(newPassword);
  if (newSecret !== undefined) next.secret = newSecret;
  state = next;
  persist();
}

module.exports = { load, checkLogin, checkPassword, getSecret, update };
