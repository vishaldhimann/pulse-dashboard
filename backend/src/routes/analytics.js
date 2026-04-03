const router = require('express').Router();
const Event = require('../models/Event');

// Helper: build date filter
function dateFilter(days = 30) {
  return new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
}

// GET /summary
router.get('/summary', async (req, res) => {
  try {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalEvents, todayEvents, weekEvents, instances, users, errorsToday] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ timestamp: { $gte: dayAgo } }),
      Event.countDocuments({ timestamp: { $gte: weekAgo } }),
      Event.distinct('instanceId'),
      Event.distinct('hashedUserId'),
      Event.countDocuments({ eventType: { $in: ['error', 'api_error'] }, timestamp: { $gte: dayAgo } })
    ]);

    res.json({
      totalEvents, todayEvents, weekEvents,
      totalInstances: instances.length,
      totalUsers: users.length,
      errorsToday
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /top-features
router.get('/top-features', async (req, res) => {
  try {
    const { limit = 10, instanceId, days = 30 } = req.query;
    const match = { timestamp: { $gte: dateFilter(days) }, eventType: { $nin: ['heartbeat'] } };
    if (instanceId) match.instanceId = instanceId;

    const result = await Event.aggregate([
      { $match: match },
      { $group: { _id: '$featureName', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$hashedUserId' } } },
      { $project: { featureName: '$_id', count: 1, uniqueUsers: { $size: '$uniqueUsers' }, _id: 0 } },
      { $sort: { count: -1 } },
      { $limit: Number(limit) }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /dau
router.get('/dau', async (req, res) => {
  try {
    const { days = 30, instanceId } = req.query;
    const match = { timestamp: { $gte: dateFilter(days) } };
    if (instanceId) match.instanceId = instanceId;

    const result = await Event.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        uniqueUsers: { $addToSet: '$hashedUserId' },
        totalEvents: { $sum: 1 }
      }},
      { $project: { date: '$_id', dau: { $size: '$uniqueUsers' }, totalEvents: 1, _id: 0 } },
      { $sort: { date: 1 } }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /heatmap
router.get('/heatmap', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await Event.aggregate([
      { $match: { timestamp: { $gte: dateFilter(days) }, eventType: { $nin: ['heartbeat'] } } },
      { $group: { _id: { instance: '$instanceId', feature: '$featureName' }, count: { $sum: 1 } } },
      { $project: { instanceId: '$_id.instance', featureName: '$_id.feature', count: 1, _id: 0 } },
      { $sort: { count: -1 } }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /funnel
router.get('/funnel', async (req, res) => {
  try {
    const { steps, instanceId, days = 30 } = req.query;
    if (!steps) return res.status(400).json({ error: 'steps required (comma-separated)' });

    const stepList = steps.split(',').map(s => s.trim());
    const match = { timestamp: { $gte: dateFilter(days) } };
    if (instanceId) match.instanceId = instanceId;

    const funnelData = await Promise.all(stepList.map(async (step, idx) => {
      const users = await Event.distinct('hashedUserId', { ...match, featureName: step });
      return { step: idx + 1, featureName: step, uniqueUsers: users.length };
    }));

    const withDropOff = funnelData.map((item, idx) => ({
      ...item,
      dropOffPercent: idx === 0 ? 0 :
        funnelData[idx - 1].uniqueUsers > 0
          ? Math.round((1 - item.uniqueUsers / funnelData[idx - 1].uniqueUsers) * 100)
          : 0
    }));
    res.json(withDropOff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /stickiness
router.get('/stickiness', async (req, res) => {
  try {
    const { instanceId } = req.query;
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const matchM = { timestamp: { $gte: monthAgo } };
    const matchD = { timestamp: { $gte: dayAgo } };
    if (instanceId) { matchM.instanceId = instanceId; matchD.instanceId = instanceId; }

    const [mau, dau] = await Promise.all([
      Event.distinct('hashedUserId', matchM),
      Event.distinct('hashedUserId', matchD)
    ]);
    res.json({ dau: dau.length, mau: mau.length, stickiness: mau.length > 0 ? Math.round((dau.length / mau.length) * 100) : 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
