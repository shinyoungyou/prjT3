'use strict';

// Password hashing with scrypt from node:crypto (no dependencies).
// scrypt is deliberately slow and memory-hungry, like bcrypt, so a stolen
// hash cannot be guessed quickly. We never store the plain password.

const crypto = require('node:crypto');
const config = require('./config');
const { HttpError } = require('./http');

const KEY_LENGTH = 64;
let active = 0;

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

// Hashing is the only expensive thing this server does. Capping how many
// run at once keeps the server answering quickly under a burst of logins:
// extra attempts get an immediate 429 instead of queueing up.
async function limited(fn) {
  if (active >= config.maxConcurrentHashes) {
    throw new HttpError(429, 'Server busy, try again shortly', { 'Retry-After': '1' });
  }
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
  }
}

async function hash(password) {
  const salt = crypto.randomBytes(16);
  const key = await limited(() => scrypt(password, salt));
  return { salt: salt.toString('hex'), hash: key.toString('hex') };
}

async function verify(password, stored) {
  const key = await limited(() => scrypt(password, Buffer.from(stored.salt, 'hex')));
  const expected = Buffer.from(stored.hash, 'hex');
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

module.exports = { hash, verify };
