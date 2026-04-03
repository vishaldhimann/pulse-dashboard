'use strict';
/**
 * Static host for Azure App Service (Linux Node).
 * Serves ./public (Angular browser output).
 */
const fs = require('fs');
const path = require('path');
const express = require('express');

const publicDir = path.join(__dirname, 'public');
const port = parseInt(process.env.PORT, 10) || 8080;

if (!fs.existsSync(path.join(publicDir, 'index.html'))) {
  console.error('Pulse UI: missing index.html in', publicDir);
}

const app = express();

// fallthrough: true — missing paths reach SPA handler (Angular routes), not plain 404
app.use(
  express.static(publicDir, {
    index: 'index.html',
    fallthrough: true,
  })
);

app.use((req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log('Pulse UI on 0.0.0.0:' + port + ' dir=' + publicDir);
});
