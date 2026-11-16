'use strict';

// Fixed-window rate limiter kept in memory.
// The password is at most 6 characters, so the real protection against
// guessing is limiting how many guesses can be made per minute.

const config = require('./config');
const { HttpError, clientIp } = require('./http');

function createLimiter({ windowMs, max, maxKeys = 20000 }) {
  const hits = new Map(); // key -> { count, reset }

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs);
  sweep.unref();

  return function take(key) {
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      // Refuse new keys when the table is full, so memory stays bounded.
      if (!entry && hits.size >= maxKeys) return { allowed: false, retryAfter: 60 };
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    return { allowed: entry.count <= max, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  };
}

const perIp = createLimiter({ windowMs: 60_000, max: config.loginPerIpPerMinute });
const everyone = createLimiter({ windowMs: 60_000, max: config.loginGlobalPerMinute });

// Called by every endpoint that checks a password (login and settings).
// The global counter is the backstop if someone rotates or fakes addresses.
function limitPasswordAttempts(req) {
  const results = [perIp(clientIp(req)), everyone('all')];
  const blocked = results.find((r) => !r.allowed);
  if (blocked) {
    throw new HttpError(429, 'Too many attempts, try again later', {
      'Retry-After': String(blocked.retryAfter),
    });
  }
}

module.exports = { createLimiter, limitPasswordAttempts };
