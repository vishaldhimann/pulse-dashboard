const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const Instance = require('../models/Instance');
const Event = require('../models/Event');

// POST — register new instance
router.post('/', async (req, res) => {
  try {
    const { name, region, clientTier, healthEndpoint } = req.body;
    const instance = await Instance.create({
      instanceId: uuidv4(),
      name,
      region: region || 'unknown',
      clientTier: clientTier || 'standard',
      apiKey: `pk_${uuidv4().replace(/-/g, '')}`,
      healthEndpoint
    });
    res.status(201).json(instance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — list all instances
router.get('/', async (req, res) => {
  try {
    const instances = await Instance.find().sort({ registeredAt: -1 });
    res.json(instances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /health — instance health overview
router.get('/health', async (req, res) => {
  try {
    const instances = await Instance.find({ isActive: true });
    const now = new Date();

    const health = await Promise.all(instances.map(async (inst) => {
      const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const [todayCount, errorCount, lastEvent] = await Promise.all([
        Event.countDocuments({ instanceId: inst.instanceId, timestamp: { $gte: dayAgo } }),
        Event.countDocuments({ instanceId: inst.instanceId, eventType: { $in: ['error', 'api_error'] }, timestamp: { $gte: dayAgo } }),
        Event.findOne({ instanceId: inst.instanceId }).sort({ timestamp: -1 })
      ]);

      const lastActivity = lastEvent ? lastEvent.timestamp : inst.registeredAt;
      const inactiveDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
      const minutesSinceHeartbeat = Math.floor((now - inst.lastHeartbeat) / (1000 * 60));

      let status = 'healthy';
      if (minutesSinceHeartbeat > 10) status = 'down';
      else if (minutesSinceHeartbeat > 3) status = 'degraded';
      else if (inactiveDays >= 3) status = 'down';

      return {
        instanceId: inst.instanceId,
        name: inst.name,
        region: inst.region,
        clientTier: inst.clientTier,
        lastHeartbeat: inst.lastHeartbeat,
        lastActivity,
        inactiveDays,
        minutesSinceHeartbeat,
        eventsToday: todayCount,
        errorsToday: errorCount,
        errorRate: todayCount > 0 ? Math.round((errorCount / todayCount) * 100 * 10) / 10 : 0,
        status
      };
    }));

    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
