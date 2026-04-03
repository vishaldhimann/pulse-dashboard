const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, index: true },
  instanceId: { type: String, required: true, index: true },
  globalClientId: { type: String, required: true, index: true },
  hashedUserId: { type: String, required: true, index: true },
  featureName: { type: String, required: true, index: true },
  eventType: {
    type: String,
    default: 'interaction'
  },
  sessionDuration: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
  region: { type: String, default: 'unknown' },
  clientTier: { type: String, default: 'standard' },
  // Error tracking fields
  errorFingerprint: { type: String, index: true },
}, { timestamps: true });

eventSchema.index({ instanceId: 1, timestamp: -1 });
eventSchema.index({ featureName: 1, timestamp: -1 });
eventSchema.index({ eventType: 1, timestamp: -1 });
eventSchema.index({ errorFingerprint: 1, timestamp: -1 });
eventSchema.index({ 'metadata.statusCode': 1, eventType: 1 });
eventSchema.index({ 'metadata.service': 1, eventType: 1 });

module.exports = mongoose.model('Event', eventSchema);
