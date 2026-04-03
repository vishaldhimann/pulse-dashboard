const mongoose = require('mongoose');

const loanEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  instanceId: { type: String, required: true, index: true },
  applicationId: { type: String, required: true, index: true },
  hashedUserId: { type: String, index: true },
  loanType: { type: String, index: true },
  requestedAmount: { type: Number },
  approvedAmount: { type: Number },
  appStatus: { type: String, index: true },
  subStatus: { type: String },
  stage: { type: String, index: true },
  fromStatus: { type: String },
  toStatus: { type: String },
  creditScore: { type: Number },
  processingTime: { type: Number },
  region: { type: String },
  clientTier: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

loanEventSchema.index({ instanceId: 1, appStatus: 1 });
loanEventSchema.index({ loanType: 1, timestamp: -1 });
loanEventSchema.index({ applicationId: 1, timestamp: -1 });

module.exports = mongoose.model('LoanEvent', loanEventSchema);
