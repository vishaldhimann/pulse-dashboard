const router = require('express').Router();
const Event = require('../models/Event');
const LoanEvent = require('../models/LoanEvent');
const Instance = require('../models/Instance');
const Alert = require('../models/Alert');

// Helper: gather analytics context for AI prompts
async function gatherContext() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [summary, topFeatures, instances, recentAlerts, errorCount, pageTimeStats, userStats, recentRouteChanges] = await Promise.all([
    Event.aggregate([
      { $facet: {
        total: [{ $count: 'n' }],
        today: [{ $match: { timestamp: { $gte: dayAgo } } }, { $count: 'n' }],
        week: [{ $match: { timestamp: { $gte: weekAgo } } }, { $count: 'n' }]
      }}
    ]),
    Event.aggregate([
      { $match: { timestamp: { $gte: weekAgo }, eventType: { $nin: ['heartbeat'] } } },
      { $group: { _id: '$featureName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 }
    ]),
    Instance.find({ isActive: true }).lean(),
    Alert.find({ isResolved: false }).sort({ createdAt: -1 }).limit(10).lean(),
    Event.countDocuments({ eventType: { $in: ['error', 'api_error'] }, timestamp: { $gte: dayAgo } }),
    // Page time stats
    Event.aggregate([
      { $match: { eventType: 'page_time', timestamp: { $gte: weekAgo } } },
      { $group: { _id: '$metadata.route', totalTime: { $sum: '$metadata.timeSpentSeconds' }, visits: { $sum: 1 }, avgTime: { $avg: '$metadata.timeSpentSeconds' } } },
      { $sort: { totalTime: -1 } }, { $limit: 10 }
    ]),
    // User stats
    Event.aggregate([
      { $match: { timestamp: { $gte: weekAgo }, 'metadata._ctx.firstName': { $exists: true } } },
      { $group: { _id: '$metadata._ctx.userId', firstName: { $first: '$metadata._ctx.firstName' }, lastName: { $first: '$metadata._ctx.lastName' }, appId: { $first: '$metadata._ctx.appId' }, businessName: { $first: '$metadata._ctx.businessName' }, events: { $sum: 1 } } },
      { $sort: { events: -1 } }, { $limit: 10 }
    ]),
    // Recent route changes
    Event.aggregate([
      { $match: { eventType: 'route_change', timestamp: { $gte: dayAgo } } },
      { $group: { _id: { from: '$metadata.fromRoute', to: '$metadata.toRoute' }, count: { $sum: 1 }, avgTime: { $avg: '$metadata.timeOnPreviousRouteSeconds' } } },
      { $sort: { count: -1 } }, { $limit: 10 }
    ])
  ]);

  return {
    totalEvents: summary[0]?.total[0]?.n || 0,
    todayEvents: summary[0]?.today[0]?.n || 0,
    weekEvents: summary[0]?.week[0]?.n || 0,
    topFeatures: topFeatures.map(f => ({ feature: f._id, count: f.count })),
    instances: instances.map(i => ({ name: i.name, region: i.region, tier: i.clientTier, status: i.status })),
    activeAlerts: recentAlerts.map(a => ({ type: a.alertType, severity: a.severity, message: a.message })),
    errorsToday: errorCount,
    pageTimeStats: pageTimeStats.map(p => ({ route: p._id, totalTimeSeconds: Math.round(p.totalTime), visits: p.visits, avgTimeSeconds: Math.round(p.avgTime) })),
    users: userStats.map(u => ({ name: (u.firstName || '') + ' ' + (u.lastName || ''), businessName: u.businessName, appId: u.appId, events: u.events })),
    topRouteTransitions: recentRouteChanges.map(r => ({ from: r._id.from, to: r._id.to, count: r.count, avgTimeOnPreviousPage: Math.round(r.avgTime) }))
  };
}

// Helper: call Azure OpenAI (or mock if not configured)
async function callAzureOpenAI(systemPrompt, userMessage) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  if (!endpoint || !key) {
    return `[AI Demo Mode] Connect Azure OpenAI for production-quality insights.`;
  }

  try {
    const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
    console.log('[AI] Calling:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 1,
        max_completion_tokens: 1000
      })
    });

    const data = await response.json();
    console.log('[AI] Status:', response.status, 'Response keys:', Object.keys(data));

    if (data.error) {
      console.error('[AI] Error:', JSON.stringify(data.error));
      return `AI Error: ${data.error.message || JSON.stringify(data.error)}`;
    }

    return data.choices?.[0]?.message?.content || 'No response from AI. Raw: ' + JSON.stringify(data).substring(0, 200);
  } catch (err) {
    console.error('[AI] Fetch error:', err.message);
    return `AI connection error: ${err.message}`;
  }
}

// POST /insights — auto-generate insights
router.post('/insights', async (req, res) => {
  try {
    const context = await gatherContext();
    const systemPrompt = `You are a SaaS product analytics expert for a lending platform. 
Analyze the telemetry data and provide 5 actionable insights for the product team. 
Be specific, cite numbers, and suggest concrete actions. Keep each insight to 2-3 sentences.`;

    const userMessage = `Here is the current analytics data:\n${JSON.stringify(context, null, 2)}`;
    const insights = await callAzureOpenAI(systemPrompt, userMessage);
    res.json({ insights, generatedAt: new Date(), context });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /chat — Ask Pulse
router.post('/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    // Only gather heavy analytics context if the question is about data
    const dataKeywords = ['page', 'time', 'user', 'error', 'api', 'route', 'session', 'event', 'click', 'activity', 'slow', 'fast', 'most', 'least', 'average', 'total', 'count', 'how many', 'which', 'what is', 'summarize', 'summary', 'report', 'analytics', 'data', 'metric', 'stat', 'performance', 'duration', 'spent', 'visit', 'traffic', 'trend', 'rate', 'instance', 'application', 'loan', 'business'];
    const isDataQuestion = dataKeywords.some(k => question.toLowerCase().includes(k));

    let contextBlock = '';
    if (isDataQuestion) {
      const context = await gatherContext();
      contextBlock = `\n\nHere is the current analytics data you can reference:\n${JSON.stringify(context, null, 2)}`;
    }

    const systemPrompt = `You are "Pulse AI", a friendly and helpful analytics assistant.

RULES:
- For casual messages like "hi", "hello", "thanks", etc — reply naturally and briefly like a human would. Do NOT dump analytics data.
- Only reference analytics data when the user specifically asks about metrics, pages, users, errors, performance, etc.
- When answering data questions, be concise and cite specific numbers.
- Do not volunteer extra analysis unless asked. Answer exactly what was asked, nothing more.
- Keep responses short and to the point.`;

    const userMessage = question + contextBlock;
    const answer = await callAzureOpenAI(systemPrompt, userMessage);
    res.json({ question, answer, generatedAt: new Date() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /churn-predict — AI churn analysis for specific instance
router.post('/churn-predict', async (req, res) => {
  try {
    const { instanceId } = req.body;
    if (!instanceId) return res.status(400).json({ error: 'instanceId required' });

    const instance = await Instance.findOne({ instanceId });
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [recentEvents, previousEvents, recentErrors, features] = await Promise.all([
      Event.countDocuments({ instanceId, timestamp: { $gte: weekAgo }, eventType: { $nin: ['heartbeat'] } }),
      Event.countDocuments({ instanceId, timestamp: { $gte: twoWeeksAgo, $lt: weekAgo }, eventType: { $nin: ['heartbeat'] } }),
      Event.countDocuments({ instanceId, eventType: { $in: ['error', 'api_error'] }, timestamp: { $gte: weekAgo } }),
      Event.distinct('featureName', { instanceId, timestamp: { $gte: weekAgo }, eventType: { $nin: ['heartbeat'] } })
    ]);

    const usageProfile = {
      name: instance.name, region: instance.region, tier: instance.clientTier,
      eventsLastWeek: recentEvents, eventsPreviousWeek: previousEvents,
      errorsLastWeek: recentErrors, featuresUsed: features.length,
      featureList: features, lastHeartbeat: instance.lastHeartbeat,
      daysSinceLastActivity: Math.floor((Date.now() - instance.lastHeartbeat) / (1000 * 60 * 60 * 24))
    };

    const systemPrompt = `You are a churn prediction expert for a SaaS lending platform.
Analyze the instance usage profile and rate churn risk from 0-100.
Provide: 1) Risk score 2) Key risk factors 3) Three recommended actions for Customer Success team.
Format as JSON: { "riskScore": number, "riskFactors": string[], "recommendations": string[], "summary": string }`;

    const answer = await callAzureOpenAI(systemPrompt, JSON.stringify(usageProfile));

    let parsed;
    try { parsed = JSON.parse(answer); } catch { parsed = { riskScore: 0, summary: answer }; }

    res.json({ instanceId, usageProfile, prediction: parsed, generatedAt: new Date() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
