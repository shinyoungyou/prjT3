'use strict';

const config = require('../config');
const { sendJson } = require('../http');

// Cheap endpoint for Render's health check and for uptime pings.
module.exports = (route) => {
  route('GET', '/health', (req, res) => {
    sendJson(res, 200, { status: 'ok', team: config.team });
  });
};
