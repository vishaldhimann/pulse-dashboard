const router = require('express').Router();
const Event = require('../models/Event');
const Instance = require('../models/Instance');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
 
function fingerprint(err) {
  const str = `${err.errorMessage || ''}:${err.errorSource || ''}:${err.statusCode || ''}`;
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 12);
}
 
// POST /api/events/ingest
router.post('/ingest', async (req, res) => {
  try {
    const { apiKey, events } = req.body;
    if (!apiKey || !events) return res.status(400).json({ error: 'apiKey and events required' });
 
    // Find or auto-register instance
    let instance = await Instance.findOne({ apiKey, isActive: true });
    if (!instance) {
      instance = await Instance.create({
        instanceId: uuidv4(),
        name: 'Auto (' + apiKey.substring(0, 12) + ')',
        region: 'unknown',
        clientTier: 'standard',
        apiKey,
        isActive: true
      });
      console.log('Auto-registered instance for key:', apiKey.substring(0, 12));
    }
 
    instance.lastHeartbeat = new Date();
    instance.status = 'healthy';
    await instance.save();
 
    const eventsArray = Array.isArray(events) ? events : [events];
    const docs = eventsArray.map(e => {
      const doc = {
        eventId: e.eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        instanceId: instance.instanceId,
        globalClientId: instance.instanceId,
        hashedUserId: e.hashedUserId || 'anonymous',
        featureName: e.featureName,
        eventType: e.eventType || 'interaction',
        sessionDuration: e.sessionDuration || 0,
        metadata: e.metadata || {},
        timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
        region: instance.region,
        clientTier: instance.clientTier
      };
      if (doc.eventType === 'error' || doc.eventType === 'api_error') {
        doc.errorFingerprint = fingerprint(doc.metadata);
      }
      return doc;
    });
 
    const inserted = await Event.insertMany(docs);
    const io = req.app.get('io');
    io.emit('new-events', { instanceId: instance.instanceId, count: inserted.length, latest: docs[docs.length - 1] });
 
    const errors = docs.filter(d => d.eventType === 'error' || d.eventType === 'api_error');
    if (errors.length > 0) io.emit('new-errors', { instanceId: instance.instanceId, errors });
 
    const heartbeats = docs.filter(d => d.eventType === 'heartbeat');
    if (heartbeats.length > 0) io.emit('heartbeat', { instanceId: instance.instanceId, data: heartbeats[0].metadata });
 
    res.status(201).json({ received: inserted.length });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: 'Ingest failed' });
  }
});
 
// GET /api/events
router.get('/', async (req, res) => {
  try {
    const { instanceId, eventType, limit = 50, offset = 0 } = req.query;
    const filter = {};
    if (instanceId) filter.instanceId = instanceId;
    if (eventType) filter.eventType = eventType;
    const [events, total] = await Promise.all([
      Event.find(filter).sort({ timestamp: -1 }).skip(Number(offset)).limit(Number(limit)),
      Event.countDocuments(filter)
    ]);
    res.json({ events, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
module.exports = router;
 
 