require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const eventRoutes = require('./routes/events');
const analyticsRoutes = require('./routes/analytics');
const instanceRoutes = require('./routes/instances');
const alertRoutes = require('./routes/alerts');
const businessIntelRoutes = require('./routes/businessIntel');
const observabilityRoutes = require('./routes/observability');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true }
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false, crossOriginOpenerPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Rate limiting for ingest endpoint
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  message: { error: 'Too many events, slow down' }
});
app.use('/api/events/ingest', ingestLimiter);

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/business-intel', businessIntelRoutes);
app.use('/api/observability', observabilityRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'alive', ts: Date.now() }));

// Serve SDK file — any app can load this via script tag
// App Service deploy uses backend/public (copied in CI); local dev uses monorepo sdk/dist
app.get('/pulse.min.js', (req, res) => {
  const bundled = path.join(__dirname, '../public/pulse.min.js');
  const monorepo = path.resolve(__dirname, '../../sdk/dist/pulse.min.js');
  const file = fs.existsSync(bundled) ? bundled : monorepo;
  if (!fs.existsSync(file)) {
    return res.status(404).type('text/plain').send('pulse.min.js missing: run copy from sdk/dist or deploy via CI');
  }
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(file);
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Dashboard connected:', socket.id);
  socket.on('disconnect', () => console.log('Dashboard disconnected:', socket.id));
});

// Connect and start
const PORT = process.env.PORT || 3200;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pulse';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Pulse API on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = { app, io };
