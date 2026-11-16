'use strict';

// Session handling: the JWT travels in an HttpOnly cookie.
//
// The server keeps NO list of sessions. A request is authenticated purely
// by verifying the JWT's signature and expiry. That is why a token stays
// valid until it expires, even after logout or a password change.

const config = require('./config');
const jwt = require('./jwt');
const { HttpError } = require('./http');

// HttpOnly      -> page JavaScript cannot read the token (limits XSS theft)
// Secure        -> only ever sent over HTTPS
// SameSite=None -> required because frontend and API are different sites
// Partitioned   -> lets browsers that block third-party cookies still keep
//                  this one, scoped to our frontend's site (CHIPS)
function cookieAttributes(maxAge) {
  const parts = ['HttpOnly', 'Path=/', `Max-Age=${maxAge}`];
  if (config.cookieSecure) parts.push('Secure', 'SameSite=None', 'Partitioned');
  else parts.push('SameSite=Lax');
  return parts.join('; ');
}

function startSession(res) {
  const token = jwt.sign({ sub: config.username }, config.jwtSecret, config.tokenTtlSeconds);
  res.setHeader(
    'Set-Cookie',
    `${config.cookieName}=${token}; ${cookieAttributes(config.tokenTtlSeconds)}`
  );
}

// Logout only tells the browser to delete its cookie.
function endSession(res) {
  res.setHeader('Set-Cookie', `${config.cookieName}=; ${cookieAttributes(0)}`);
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index !== -1 && pair.slice(0, index).trim() === name) {
      return pair.slice(index + 1).trim();
    }
  }
  return null;
}

// Returns the JWT payload, or throws 401 so the frontend redirects to login.
function requireAuth(req) {
  const claims = jwt.verify(readCookie(req, config.cookieName), config.jwtSecret);
  if (!claims || claims.sub !== config.username) {
    throw new HttpError(401, 'Not authenticated');
  }
  return claims;
}

module.exports = { startSession, endSession, requireAuth };
