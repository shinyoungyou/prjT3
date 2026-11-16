'use strict';

// Hand-written JSON Web Token (HS256) using only node:crypto.
//
// A JWT is three base64url parts joined by dots:
//   base64url(header) . base64url(payload) . base64url(signature)
// The signature is HMAC-SHA256 over "header.payload" using a key only the
// server knows. Anyone can READ a JWT; nobody can CHANGE one without the key.

const crypto = require('node:crypto');

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function hmac(data, key) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sign(claims, key, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ ...claims, iat: now, exp: now + ttlSeconds })
  ).toString('base64url');
  const signature = hmac(`${HEADER}.${payload}`, key).toString('base64url');
  return `${HEADER}.${payload}.${signature}`;
}

// Returns the payload if the token is genuine and unexpired, otherwise null.
function verify(token, key) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;

  // 1. Check the signature first, in constant time, before trusting anything.
  const expected = hmac(`${header}.${payload}`, key);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    // 2. Only accept the algorithm we issue. The token never gets to pick
    //    its own algorithm (this is what blocks the classic "alg: none" trick).
    const head = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (head.alg !== 'HS256' || head.typ !== 'JWT') return null;

    // 3. Check expiry.
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
