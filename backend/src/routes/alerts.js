const router = require('express').Router();
const Alert = require('../models/Alert');
const Event = require('../models/Event');
const Instance = require('../models/Instance');

// GET /
router.get('/', async (req, res) => {
  try {
    const { resolved, severity, type } = req.query;
    const filter = {};
    if (resolved !== undefined) filter.isResolved = resolved === 'true';
    if (severity) filter.severity = severity;
    if (type) filter.alertType = type;
    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(alerts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /:id/resolve
router.patch('/:id/resolve', async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true, resolvedAt: new Date() },
      { new: true }
    );
    res.json(alert);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /detect-churn — run churn detection
router.post('/detect-churn', async (req, res) => {
  try {
    const instances = await Instance.find({ isActive: true });
    const now = new Date();
    const alerts = [];

    for (const inst of instances) {
      // Rule: Zero activity for 3 days
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const recentCount = await Event.countDocuments({
        instanceId: inst.instanceId,
        timestamp: { $gte: threeDaysAgo },
        eventType: { $nin: ['heartbeat'] }
      });

      if (recentCount === 0) {
        const existing = await Alert.findOne({ instanceId: inst.instanceId, alertType: 'zero_activity', isResolved: false });
        if (!existing) {
          alerts.push(await Alert.create({
            instanceId: inst.instanceId, globalClientId: inst.instanceId,
            alertType: 'zero_activity', severity: 'critical',
            message: `Instance "${inst.name}" has zero activity for 3+ days`,
            metadata: { lastHeartbeat: inst.lastHeartbeat }
          }));
        }
      }

      // Rule: 40% drop in 2 weeks
      const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
      const fourWeeksAgo = new Date(now - 28 * 24 * 60 * 60 * 1000);
      const [recent, previous] = await Promise.all([
        Event.countDocuments({ instanceId: inst.instanceId, timestamp: { $gte: twoWeeksAgo }, eventType: { $nin: ['heartbeat'] } }),
        Event.countDocuments({ instanceId: inst.instanceId, timestamp: { $gte: fourWeeksAgo, $lt: twoWeeksAgo }, eventType: { $nin: ['heartbeat'] } })
      ]);

      if (previous > 0) {
        const drop = ((previous - recent) / previous) * 100;
        if (drop >= 40) {
          const existing = await Alert.findOne({ instanceId: inst.instanceId, alertType: 'churn_risk', isResolved: false });
          if (!existing) {
            alerts.push(await Alert.create({
              instanceId: inst.instanceId, globalClientId: inst.instanceId,
              alertType: 'churn_risk', severity: 'warning',
              message: `Instance "${inst.name}" activity dropped ${Math.round(drop)}% over 2 weeks`,
              metadata: { recent, previous, dropPercent: Math.round(drop) }
            }));
          }
        }
      }
    }

    const io = req.app.get('io');
    if (alerts.length > 0) io.emit('new-alerts', alerts);
    res.json({ detected: alerts.length, alerts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
