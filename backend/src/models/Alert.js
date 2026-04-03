const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  instanceId: { type: String, required: true, index: true },
  globalClientId: { type: String },
  alertType: {
    type: String, required: true,
    enum: ['churn_risk', 'zero_activity', 'error_spike', 'high_error_rate',
           'instance_down', 'instance_degraded', 'service_down',
           'new_error', 'user_facing_errors', 'performance_degradation']
  },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  message: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  isResolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

alertSchema.index({ alertType: 1, isResolved: 1 });
alertSchema.index({ instanceId: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
