/**
 * Pulse Seed Script — generates 30 days of realistic demo data
 * Run: node src/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Event = require('./models/Event');
const Instance = require('./models/Instance');
const Alert = require('./models/Alert');
const LoanEvent = require('./models/LoanEvent');
const crypto = require('crypto');

const FEATURES = [
  'dashboard_view', 'loan_application', 'document_upload', 'credit_check',
  'user_profile', 'payment_processing', 'report_generation', 'settings_page',
  'notification_center', 'search', 'export_data', 'setup_wizard',
  'approval_workflow', 'customer_onboarding', 'analytics_view'
];

const SERVICES = [
  { name: 'credit_score', avgRT: 250, errorRate: 0.04 },
  { name: 'document', avgRT: 85, errorRate: 0.01 },
  { name: 'underwriter', avgRT: 120, errorRate: 0.005 },
  { name: 'application', avgRT: 45, errorRate: 0.002 },
  { name: 'bankstatement', avgRT: 340, errorRate: 0.08 },
  { name: 'classification', avgRT: 90, errorRate: 0.005 }
];

const LOAN_STATUSES = [
  'app_submitted', 'in_review_mlro', 'in_review_cred_ops', 'additional_info_requested',
  'in_review_uw', 'in_review_suw', 'in_review_cco', 'approved', 'suw_approved', 'cco_approved',
  'offer_sent', 'offer_accepted', 'esign_pending', 'esign_accepted', 'sent_to_servicing',
  'application_declined', 'sme_declined', 'app_withdrawn', 'on_hold'
];

const STAGES = ['unassigned', 'fulfillment_ops', 'review', 'underwriting', 'credit_modification', 'approved', 'offer', 'sent_to_servicing'];

const JS_ERRORS = [
  { msg: "Cannot read property 'loan_id' of undefined", src: 'loan_application.component.ts:142' },
  { msg: 'TypeError: null is not an object', src: 'credit_check.service.ts:89' },
  { msg: 'ChunkLoadError: Loading chunk 7 failed', src: 'webpack:///lazy-module' },
  { msg: 'HttpErrorResponse: 0 Unknown Error', src: 'http_interceptor.ts:45' },
  { msg: "Cannot read property 'status' of null", src: 'approval_workflow.component.ts:201' }
];

const INSTANCES = [
  { name: 'Acme Bank', region: 'us-east', clientTier: 'enterprise', activity: 'high' },
  { name: 'Nordic Finance', region: 'eu-west', clientTier: 'enterprise', activity: 'high' },
  { name: 'QuickLend', region: 'us-west', clientTier: 'standard', activity: 'medium' },
  { name: 'Capital Trust', region: 'ap-south', clientTier: 'premium', activity: 'medium' },
  { name: 'Silent Corp', region: 'eu-central', clientTier: 'standard', activity: 'churning' }
];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fp(msg, src) { return crypto.createHash('md5').update(`${msg}:${src}`).digest('hex').substring(0, 12); }

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pulse');
  console.log('Connected to MongoDB');

  await Promise.all([Event.deleteMany({}), Instance.deleteMany({}), Alert.deleteMany({}), LoanEvent.deleteMany({})]);
  console.log('Cleared data');

  // Create instances
  const instances = [];
  for (const inst of INSTANCES) {
    const created = await Instance.create({
      instanceId: uuidv4(), name: inst.name, region: inst.region,
      clientTier: inst.clientTier, apiKey: `pk_${uuidv4().replace(/-/g, '')}`,
      status: inst.activity === 'churning' ? 'down' : 'healthy'
    });
    created._activity = inst.activity;
    instances.push(created);
    console.log(`  ${inst.name}: ${created.apiKey}`);
  }

  const now = Date.now();
  const events = [];
  const loanEvents = [];

  for (const inst of instances) {
    const isSilent = inst._activity === 'churning';
    const isHigh = inst._activity === 'high';
    const usersCount = isHigh ? 25 : isSilent ? 3 : 12;
    const userIds = Array.from({ length: usersCount }, () => uuidv4().substring(0, 16));

    // Silent Corp: no events in last 4 days
    const activeDays = isSilent ? 26 : 30;
    const startOffset = isSilent ? 4 : 0;

    for (let day = startOffset; day < activeDays + startOffset; day++) {
      const dayTs = now - (30 - (day - startOffset)) * 24 * 60 * 60 * 1000;
      const eventsPerDay = isSilent ? rand(1, 5) : isHigh ? rand(30, 60) : rand(10, 25);

      for (let e = 0; e < eventsPerDay; e++) {
        const hourOffset = rand(0, 23) * 3600000 + rand(0, 59) * 60000;
        const userId = pick(userIds);
        const feature = pick(FEATURES);
        const isError = Math.random() < 0.03;
        const isApiCall = Math.random() < 0.15;

        if (isApiCall) {
          const svc = pick(SERVICES);
          const svcError = Math.random() < svc.errorRate;
          const rt = svc.avgRT + rand(-50, 200);
          events.push({
            eventId: uuidv4(), instanceId: inst.instanceId, globalClientId: inst.instanceId,
            hashedUserId: userId, featureName: svc.name, eventType: 'api_call',
            metadata: { service: svc.name, responseTime: rt, statusCode: svcError ? pick([500, 502, 503, 408]) : 200, method: 'POST' },
            timestamp: new Date(dayTs + hourOffset), region: inst.region, clientTier: inst.clientTier
          });
        } else if (isError) {
          const jsErr = pick(JS_ERRORS);
          events.push({
            eventId: uuidv4(), instanceId: inst.instanceId, globalClientId: inst.instanceId,
            hashedUserId: userId, featureName: 'js_error', eventType: 'error',
            errorFingerprint: fp(jsErr.msg, jsErr.src),
            metadata: { errorMessage: jsErr.msg, errorSource: jsErr.src, statusCode: pick([404, 500]), page: `/${pick(FEATURES)}` },
            timestamp: new Date(dayTs + hourOffset), region: inst.region, clientTier: inst.clientTier
          });
        } else {
          events.push({
            eventId: uuidv4(), instanceId: inst.instanceId, globalClientId: inst.instanceId,
            hashedUserId: userId, featureName: feature, eventType: pick(['interaction', 'pageview']),
            sessionDuration: rand(30, 1800), metadata: {},
            timestamp: new Date(dayTs + hourOffset), region: inst.region, clientTier: inst.clientTier
          });
        }
      }

      // Heartbeat events (1 per hour for active instances)
      if (!isSilent || day < activeDays) {
        for (let h = 0; h < 24; h++) {
          events.push({
            eventId: uuidv4(), instanceId: inst.instanceId, globalClientId: inst.instanceId,
            hashedUserId: 'system', featureName: 'system_health', eventType: 'heartbeat',
            metadata: { uptime: (30 - day) * 86400 + h * 3600, memoryUsage: rand(40, 85), cpuLoad: rand(10, 70), activeConnections: rand(20, 300), status: 'healthy' },
            timestamp: new Date(dayTs + h * 3600000), region: inst.region, clientTier: inst.clientTier
          });
        }
      }

      // Loan events (5-15 per day for active instances)
      const loansPerDay = isSilent ? rand(0, 2) : isHigh ? rand(10, 20) : rand(3, 8);
      for (let l = 0; l < loansPerDay; l++) {
        const appId = `APP_${uuidv4().substring(0, 8)}`;
        const amount = pick([50000, 75000, 100000, 150000, 200000, 300000, 500000, 750000, 1000000]);
        const score = rand(550, 800);
        // Simulate progression through statuses
        const maxStage = rand(1, LOAN_STATUSES.length - 5);
        const finalStatus = LOAN_STATUSES[Math.min(maxStage, LOAN_STATUSES.length - 1)];
        const stage = maxStage <= 3 ? 'review' : maxStage <= 7 ? 'underwriting' : maxStage <= 10 ? 'approved' : 'offer';
        const approved = maxStage >= 7;

        loanEvents.push({
          eventId: uuidv4(), instanceId: inst.instanceId, applicationId: appId,
          hashedUserId: pick(userIds), loanType: 'revenue_based_financing',
          requestedAmount: amount, approvedAmount: approved ? amount * (rand(70, 100) / 100) : 0,
          appStatus: finalStatus, stage, creditScore: score,
          processingTime: rand(3600, 259200), // 1h to 3 days in seconds
          region: inst.region, clientTier: inst.clientTier,
          timestamp: new Date(dayTs + rand(0, 23) * 3600000)
        });
      }
    }
  }

  // Batch insert
  const batchSize = 500;
  for (let i = 0; i < events.length; i += batchSize) {
    await Event.insertMany(events.slice(i, i + batchSize));
  }
  console.log(`Inserted ${events.length} events`);

  for (let i = 0; i < loanEvents.length; i += batchSize) {
    await LoanEvent.insertMany(loanEvents.slice(i, i + batchSize));
  }
  console.log(`Inserted ${loanEvents.length} loan events`);

  console.log('\nSeed complete! API keys:');
  instances.forEach(i => console.log(`  ${i.name}: ${i.apiKey}`));

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
