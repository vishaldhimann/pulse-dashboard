const mongoose = require('mongoose');

const instanceSchema = new mongoose.Schema({
  instanceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  region: { type: String, default: 'unknown' },
  clientTier: { type: String, default: 'standard' },
  apiKey: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  lastHeartbeat: { type: Date, default: Date.now },
  healthEndpoint: { type: String },
  // Uptime tracking
  status: { type: String, enum: ['healthy', 'degraded', 'down', 'unknown'], default: 'unknown' },
  uptimeRecords: [{
    _id: false,
    date: String,
    uptimeMinutes: { type: Number, default: 1440 },
    downMinutes: { type: Number, default: 0 }
  }],
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Instance', instanceSchema);
