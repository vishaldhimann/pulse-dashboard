const router = require('express').Router();
const Event = require('../models/Event');
const LoanEvent = require('../models/LoanEvent');
const Instance = require('../models/Instance');
const Alert = require('../models/Alert');

// Helper: gather analytics context for AI prompts
async function gatherContext() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [summary, topFeatures, instances, recentAlerts, errorCount] = await Promise.all([
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
    Event.countDocuments({ eventType: { $in: ['error', 'api_error'] }, timestamp: { $gte: dayAgo } })
  ]);

  return {
    totalEvents: summary[0]?.total[0]?.n || 0,
    todayEvents: summary[0]?.today[0]?.n || 0,
    weekEvents: summary[0]?.week[0]?.n || 0,
    topFeatures: topFeatures.map(f => ({ feature: f._id, count: f.count })),
    instances: instances.map(i => ({ name: i.name, region: i.region, tier: i.clientTier, status: i.status, lastHeartbeat: i.lastHeartbeat })),
    activeAlerts: recentAlerts.map(a => ({ type: a.alertType, severity: a.severity, message: a.message, instance: a.instanceId })),
    errorsToday: errorCount
  };
}

// Helper: call Azure OpenAI (or mock if not configured)
async function callAzureOpenAI(systemPrompt, userMessage) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const key = process.env.AZURE_OPENAI_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';

  if (!endpoint || !key) {
    // Mock response for demo when Azure is not configured
    return `[AI Demo Mode] Based on the analytics data provided, here are the key insights:\n\n` +
      `1. The platform shows healthy engagement across most instances.\n` +
      `2. Feature adoption varies significantly between enterprise and standard tier clients.\n` +
      `3. Instances with declining activity should be flagged for customer success outreach.\n\n` +
      `Note: Connect Azure OpenAI for production-quality insights.`;
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-01`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': key },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from AI';
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

    const context = await gatherContext();
    const systemPrompt = `You are "Pulse AI", an analytics assistant for a federated SaaS lending platform.
You have access to cross-instance telemetry data. Answer questions about feature usage, instance health, 
churn risk, errors, and business metrics. Be concise and data-driven. If you don't have enough data, say so.`;

    const userMessage = `Analytics context:\n${JSON.stringify(context, null, 2)}\n\nUser question: ${question}`;
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
