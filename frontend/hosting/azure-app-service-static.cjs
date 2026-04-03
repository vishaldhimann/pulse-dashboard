'use strict';
/**
 * Minimal static host for Azure App Service (Linux Node).
 * Serves ./wwwroot (Angular browser output) with SPA fallback.
 */
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

const publicDir = path.join(__dirname, 'wwwroot');
const port = parseInt(process.env.PORT, 10) || 8080;

const server = http.createServer((req, res) =>
  handler(req, res, {
    public: publicDir,
    rewrites: [{ source: '**', destination: '/index.html' }],
  })
);

server.listen(port, '0.0.0.0', () => {
  console.log('Pulse UI static server on 0.0.0.0:' + port);
});
