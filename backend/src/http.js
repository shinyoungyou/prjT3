'use strict';

// Small HTTP helpers: JSON responses, JSON body parsing, and CORS.

const config = require('./config');

class HttpError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.status = status;
    this.headers = headers;
  }
}

function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function isAllowedOrigin(origin) {
  return Boolean(origin) && config.frontendOrigins.includes(origin);
}

// CORS with credentials: the browser only exposes the response (and sends
// the cookie) if we echo the exact origin and allow credentials. A wildcard
// "*" is not permitted together with credentials.
function applyCors(req, res) {
  res.setHeader('Vary', 'Origin');
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

function sendPreflight(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
  });
  res.end();
}

// CSRF defence. The cookie is SameSite=None (it has to be, the frontend is
// on another site), so the browser would attach it to requests from any
// website. State-changing requests must therefore come from our frontend.
function requireAllowedOrigin(req) {
  if (!isAllowedOrigin(req.headers.origin)) {
    throw new HttpError(403, 'Origin not allowed');
  }
}

// Reads a small JSON body. Rejects wrong content types, oversized bodies
// (so nobody can make us buffer megabytes) and malformed JSON.
function readJson(req) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers['content-type'] || '');
    if (!type.toLowerCase().startsWith('application/json')) {
      reject(new HttpError(415, 'Content-Type must be application/json'));
      return;
    }
    const chunks = [];
    let size = 0;
    let done = false;
    const fail = (err) => {
      if (done) return;
      done = true;
      reject(err);
    };
    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > config.maxBodyBytes) {
        fail(new HttpError(413, 'Request body too large', { Connection: 'close' }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (data === null || typeof data !== 'object' || Array.isArray(data)) {
          throw new Error('not an object');
        }
        resolve(data);
      } catch {
        reject(new HttpError(400, 'Body must be a JSON object'));
      }
    });
    req.on('error', () => fail(new HttpError(400, 'Could not read request body')));
  });
}

// Render puts the caller's address in X-Forwarded-For. A client can add its
// own values to that header, so per-IP limits are backed by a global limit.
function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

module.exports = {
  HttpError,
  sendJson,
  applyCors,
  sendPreflight,
  requireAllowedOrigin,
  readJson,
  clientIp,
};
