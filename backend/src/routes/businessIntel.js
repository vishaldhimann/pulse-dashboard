const router = require('express').Router();
const LoanEvent = require('../models/LoanEvent');

function dateFilter(days = 30) {
  return new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
}

// GET /loan-demand — amount distribution
router.get('/loan-demand', async (req, res) => {
  try {
    const { days = 30, instanceId } = req.query;
    const match = { timestamp: { $gte: dateFilter(days) }, requestedAmount: { $gt: 0 } };
    if (instanceId) match.instanceId = instanceId;

    const result = await LoanEvent.aggregate([
      { $match: match },
      { $bucket: {
        groupBy: '$requestedAmount',
        boundaries: [0, 50000, 100000, 200000, 500000, 1000000, 5000000],
        default: '5000000+',
        output: { count: { $sum: 1 }, avgAmount: { $avg: '$requestedAmount' } }
      }}
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /application-funnel — real lending funnel
router.get('/application-funnel', async (req, res) => {
  try {
    const { days = 30, instanceId } = req.query;
    const match = { timestamp: { $gte: dateFilter(days) } };
    if (instanceId) match.instanceId = instanceId;

    const stages = [
      'app_submitted', 'in_review_mlro', 'in_review_cred_ops',
      'in_review_uw', 'approved', 'offer_sent',
      'offer_accepted', 'sent_to_servicing'
    ];

    const funnel = await Promise.all(stages.map(async (stage, idx) => {
      const count = await LoanEvent.distinct('applicationId', { ...match, appStatus: stage });
      return { step: idx + 1, stage, label: stage.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), count: count.length };
    }));

    const withDropOff = funnel.map((item, idx) => ({
      ...item,
      dropOffPercent: idx === 0 || funnel[idx - 1].count === 0 ? 0 :
        Math.round((1 - item.count / funnel[idx - 1].count) * 100)
    }));
    res.json(withDropOff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /approval-rates — per instance
router.get('/approval-rates', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const match = { timestamp: { $gte: dateFilter(days) } };

    const result = await LoanEvent.aggregate([
      { $match: match },
      { $group: {
        _id: '$instanceId',
        total: { $addToSet: '$applicationId' },
        approved: { $addToSet: { $cond: [{ $in: ['$appStatus', ['approved', 'offer_sent', 'offer_accepted', 'sent_to_servicing']] }, '$applicationId', null] } }
      }},
      { $project: {
        instanceId: '$_id', _id: 0,
        totalApps: { $size: '$total' },
        approvedApps: { $size: { $filter: { input: '$approved', cond: { $ne: ['$$this', null] } } } }
      }}
    ]);

    const withRate = result.map(r => ({
      ...r,
      approvalRate: r.totalApps > 0 ? Math.round((r.approvedApps / r.totalApps) * 100) : 0
    }));
    res.json(withRate);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /processing-time — avg time per stage
router.get('/processing-time', async (req, res) => {
  try {
    const { days = 30, instanceId } = req.query;
    const match = { timestamp: { $gte: dateFilter(days) }, processingTime: { $gt: 0 } };
    if (instanceId) match.instanceId = instanceId;

    const result = await LoanEvent.aggregate([
      { $match: match },
      { $group: { _id: { stage: '$stage', instance: '$instanceId' }, avgTime: { $avg: '$processingTime' }, count: { $sum: 1 } } },
      { $project: { stage: '$_id.stage', instanceId: '$_id.instance', avgTimeHours: { $round: [{ $divide: ['$avgTime', 3600] }, 1] }, count: 1, _id: 0 } },
      { $sort: { stage: 1 } }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /credit-distribution — AECB score ranges
router.get('/credit-distribution', async (req, res) => {
  try {
    const { days = 30, instanceId } = req.query;
    const match = { timestamp: { $gte: dateFilter(days) }, creditScore: { $gt: 0 } };
    if (instanceId) match.instanceId = instanceId;

    const result = await LoanEvent.aggregate([
      { $match: match },
      { $bucket: {
        groupBy: '$creditScore',
        boundaries: [0, 550, 620, 660, 700, 715, 741, 750, 900],
        default: '900+',
        output: { count: { $sum: 1 }, avgScore: { $avg: '$creditScore' } }
      }}
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /offer-acceptance — offer sent vs accepted vs declined
router.get('/offer-acceptance', async (req, res) => {
  try {
    const { days = 30, instanceId } = req.query;
    const match = { timestamp: { $gte: dateFilter(days) }, appStatus: { $in: ['offer_sent', 'offer_accepted', 'sme_declined', 'esign_pending', 'esign_accepted'] } };
    if (instanceId) match.instanceId = instanceId;

    const result = await LoanEvent.aggregate([
      { $match: match },
      { $group: { _id: '$appStatus', count: { $addToSet: '$applicationId' } } },
      { $project: { status: '$_id', count: { $size: '$count' }, _id: 0 } }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /service-health — downstream service performance
router.get('/service-health', async (req, res) => {
  try {
    const { hours = 24, instanceId } = req.query;
    const Event = require('../models/Event');
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);
    const match = { timestamp: { $gte: since }, eventType: 'api_call', 'metadata.service': { $exists: true } };
    if (instanceId) match.instanceId = instanceId;

    const result = await Event.aggregate([
      { $match: match },
      { $group: {
        _id: '$metadata.service',
        totalCalls: { $sum: 1 },
        avgResponseTime: { $avg: '$metadata.responseTime' },
        errors: { $sum: { $cond: [{ $gte: ['$metadata.statusCode', 400] }, 1, 0] } },
        maxResponseTime: { $max: '$metadata.responseTime' }
      }},
      { $project: {
        service: '$_id', _id: 0, totalCalls: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 0] },
        maxResponseTime: 1,
        errors: 1,
        errorRate: { $round: [{ $multiply: [{ $divide: ['$errors', '$totalCalls'] }, 100] }, 1] }
      }},
      { $sort: { errorRate: -1 } }
    ]);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
