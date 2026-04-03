const router = require('express').Router();
const Event = require('../models/Event');
const Instance = require('../models/Instance');
const Alert = require('../models/Alert');

// GET /errors — grouped errors
router.get('/errors', async (req, res) => {
  try {
    const { instanceId, hours = 24 } = req.query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    const match = { eventType: { $in: ['error', 'api_error'] }, timestamp: { $gte: since } };
    if (instanceId) match.instanceId = instanceId;

    const result = await Event.aggregate([
      { $match: match },
      { $group: {
        _id: '$errorFingerprint',
        count: { $sum: 1 },
        lastSeen: { $max: '$timestamp' },
        firstSeen: { $min: '$timestamp' },
        affectedUsers: { $addToSet: '$hashedUserId' },
        affectedInstances: { $addToSet: '$instanceId' },
        sample: { $first: '$$ROOT' }
      }},
      { $project: {
        fingerprint: '$_id', _id: 0, count: 1, lastSeen: 1, firstSeen: 1,
        affectedUsers: { $size: '$affectedUsers' },
        affectedInstances: { $size: '$affectedInstances' },
        errorMessage: '$sample.metadata.errorMessage',
        errorSource: '$sample.metadata.errorSource',
        statusCode: '$sample.metadata.statusCode',
        eventType: '$sample.eventType',
        featureName: '$sample.featureName',
        service: '$sample.metadata.service'
      }},
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /error-timeline — errors over time
router.get('/error-timeline', async (req, res) => {
  try {
    const { instanceId, hours = 24 } = req.query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    const match = { eventType: { $in: ['error', 'api_error'] }, timestamp: { $gte: since } };
    if (instanceId) match.instanceId = instanceId;

    const result = await Event.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%dT%H:00:00', date: '$timestamp' } },
        count: { $sum: 1 },
        uniqueErrors: { $addToSet: '$errorFingerprint' }
      }},
      { $project: { hour: '$_id', count: 1, uniqueErrors: { $size: '$uniqueErrors' }, _id: 0 } },
      { $sort: { hour: 1 } }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /uptime — daily uptime per instance
router.get('/uptime', async (req, res) => {
  try {
    const { instanceId, days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Calculate uptime from heartbeat events
    const match = { eventType: 'heartbeat', timestamp: { $gte: since } };
    if (instanceId) match.instanceId = instanceId;

    const result = await Event.aggregate([
      { $match: match },
      { $group: {
        _id: { instance: '$instanceId', date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } } },
        heartbeats: { $sum: 1 },
        avgMemory: { $avg: '$metadata.memoryUsage' },
        avgCpu: { $avg: '$metadata.cpuLoad' }
      }},
      { $project: {
        instanceId: '$_id.instance', date: '$_id.date', _id: 0,
        heartbeats: 1, avgMemory: { $round: ['$avgMemory', 1] }, avgCpu: { $round: ['$avgCpu', 1] },
        // 1440 expected heartbeats per day (1 per minute), calculate uptime %
        uptimePercent: { $round: [{ $multiply: [{ $divide: ['$heartbeats', 1440] }, 100] }, 2] }
      }},
      { $sort: { date: 1 } }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /system-metrics — memory, CPU, connections from heartbeats
router.get('/system-metrics', async (req, res) => {
  try {
    const { instanceId, hours = 24 } = req.query;
    if (!instanceId) return res.status(400).json({ error: 'instanceId required' });

    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    const result = await Event.find({
      instanceId, eventType: 'heartbeat', timestamp: { $gte: since }
    }).sort({ timestamp: 1 }).select('timestamp metadata').lean();

    const metrics = result.map(r => ({
      timestamp: r.timestamp,
      memoryUsage: r.metadata?.memoryUsage || 0,
      cpuLoad: r.metadata?.cpuLoad || 0,
      activeConnections: r.metadata?.activeConnections || 0,
      uptime: r.metadata?.uptime || 0
    }));
    res.json(metrics);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /errors-by-instance — error count per instance
router.get('/errors-by-instance', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    const result = await Event.aggregate([
      { $match: { eventType: { $in: ['error', 'api_error'] }, timestamp: { $gte: since } } },
      { $group: { _id: '$instanceId', errorCount: { $sum: 1 }, uniqueErrors: { $addToSet: '$errorFingerprint' } } },
      { $project: { instanceId: '$_id', _id: 0, errorCount: 1, uniqueErrors: { $size: '$uniqueErrors' } } },
      { $sort: { errorCount: -1 } }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
