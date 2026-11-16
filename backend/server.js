'use strict';

// API server built only on Node.js built-in modules.
//
// It listens on plain HTTP because Render terminates HTTPS at its edge and
// forwards the request to this process. Browsers only ever see https://.

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const config = require('./src/config');
const { HttpError, sendJson, applyCors, sendPreflight } = require('./src/http');

// "METHOD /path" -> handler. Each file in src/routes registers its own routes.
const routes = new Map();
const route = (method, pathname, handler) => {
  routes.set(`${method} ${config.basePath}${pathname}`, handler);
};

const routesDir = path.join(__dirname, 'src', 'routes');
for (const file of fs.readdirSync(routesDir).filter((f) => f.endsWith('.js')).sort()) {
  require(path.join(routesDir, file))(route);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  applyCors(req, res);

  try {
    if (req.method === 'OPTIONS') {
      sendPreflight(res);
      return;
    }
    let pathname;
    try {
      pathname = new URL(req.url, 'http://localhost').pathname.replace(/\/+$/, '') || '/';
    } catch {
      throw new HttpError(400, 'Bad request URL');
    }
    const handler = routes.get(`${req.method} ${pathname}`);
    if (!handler) throw new HttpError(404, 'Not found');
    await handler(req, res);
  } catch (err) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.message }, err.headers);
    } else {
      console.error('[server] unexpected error:', err);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  }
});

// Drop clients that send headers or bodies very slowly, so a handful of
// stalled connections cannot tie the server up.
server.headersTimeout = 5000;
server.requestTimeout = 8000;
server.keepAliveTimeout = 5000;

server.listen(config.port, () => {
  console.log(`[server] ${config.team} API listening on port ${config.port}`);
  console.log(`[server] allowed frontend origins: ${config.frontendOrigins.join(', ')}`);
});
