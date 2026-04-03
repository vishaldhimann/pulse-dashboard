/**
 * PulseCore — Framework-agnostic telemetry engine
 * Handles: event queue, batching, flushing, anonymization, plugins
 */
const { hashString, generateEventId, sanitizeMetadata } = require('./utils');

const DEFAULTS = {
  flushInterval: 5000,
  maxBatchSize: 25,
  maxQueueSize: 1000,
  retryAttempts: 3,
  retryDelay: 1000,
  anonymize: true,
  respectDoNotTrack: true,
  consentRequired: false,
  trackErrors: true,
  trackSessions: true,
  sampleRate: 1,
  debug: false,
  dryRun: false
};

class PulseCore {
  constructor(config) {
    if (!config?.apiKey) throw new Error('PulseSDK: apiKey is required');
    if (!config?.endpoint) throw new Error('PulseSDK: endpoint is required');

    this.config = { ...DEFAULTS, ...config };
    this.config.endpoint = this.config.endpoint.replace(/\/$/, '');
    this.queue = [];
    this.userId = config.userId ? hashString(config.userId) : hashString(`anon_${Date.now()}`);
    this.sessionStart = Date.now();
    this.plugins = [];
    this.eventTypes = {};
    this._timer = null;
    this._destroyed = false;

    // Initialize plugins
    if (config.plugins) {
      config.plugins.forEach(p => this.use(p));
    }

    this._startFlushing();
    this._log('Pulse SDK initialized');
  }

  // Plugin system
  use(plugin) {
    if (plugin.setup) plugin.setup(this);
    this.plugins.push(plugin);
    this._log(`Plugin loaded: ${plugin.name}`);
    return this;
  }

  registerEventType(name, schema) {
    this.eventTypes[name] = schema;
  }

  // Identity
  identify(userId) {
    this.userId = this.config.anonymize ? hashString(String(userId)) : String(userId);
    return this;
  }

  // Core tracking
  track(featureName, metadata = {}) {
    if (this._destroyed) return this;
    if (this.config.consentRequired && !this._hasConsent) return this;

    // Sampling
    if (this.config.sampleRate < 1 && Math.random() > this.config.sampleRate) return this;

    // Filtering
    if (this.config.allowedEvents && !this.config.allowedEvents.includes(featureName)) return this;
    if (this.config.blockedEvents && this.config.blockedEvents.includes(featureName)) return this;

    const eventType = metadata._type || 'interaction';
    delete metadata._type;

    let event = {
      eventId: generateEventId(),
      hashedUserId: this.userId,
      featureName,
      eventType,
      sessionDuration: Math.round((Date.now() - this.sessionStart) / 1000),
      metadata: sanitizeMetadata(metadata, this.config.piiFields),
      timestamp: new Date().toISOString()
    };

    // Run plugin beforeTrack hooks
    for (const plugin of this.plugins) {
      if (plugin.beforeTrack) {
        event = plugin.beforeTrack(event);
        if (!event) return this; // Plugin dropped the event
      }
    }

    this.queue.push(event);
    this._log(`tracked: ${featureName} (${eventType})`);

    if (this.queue.length >= this.config.maxBatchSize) this.flush();

    // Run plugin afterTrack hooks
    for (const plugin of this.plugins) {
      if (plugin.afterTrack) plugin.afterTrack(event);
    }

    return this;
  }

  // Convenience methods
  trackError(featureName, errorMessage, metadata = {}) {
    return this.track(featureName, { ...metadata, _type: 'error', errorMessage });
  }

  trackApiError(service, statusCode, metadata = {}) {
    return this.track('service_error', { ...metadata, _type: 'api_error', service, statusCode });
  }

  trackPageView(pageName, metadata = {}) {
    return this.track(pageName, { ...metadata, _type: 'pageview' });
  }

  trackApiCall(service, endpoint, responseTime, statusCode, metadata = {}) {
    return this.track(service, { ...metadata, _type: 'api_call', service, endpoint, responseTime, statusCode });
  }

  trackHeartbeat(metrics) {
    return this.track('system_health', { ...metrics, _type: 'heartbeat' });
  }

  // Consent management
  grantConsent() { this._hasConsent = true; return this; }
  revokeConsent() { this._hasConsent = false; return this; }

  // Flush queue
  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, this.config.maxBatchSize);
    const payload = { apiKey: this.config.apiKey, events: batch };

    if (this.config.dryRun) {
      this._log(`[DRY RUN] Would send ${batch.length} events`);
      return;
    }

    await this._send(payload);
  }

  async _send(payload, attempt = 1) {
    try {
      await this._transport(payload);
      this._log(`Flushed ${payload.events.length} events`);
    } catch (err) {
      if (attempt < this.config.retryAttempts) {
        this._log(`Retry ${attempt}/${this.config.retryAttempts}`);
        await new Promise(r => setTimeout(r, this.config.retryDelay * attempt));
        return this._send(payload, attempt + 1);
      }
      this._log(`Failed after ${this.config.retryAttempts} retries: ${err.message}`);
    }
  }

  // Override in subclasses (browser uses beacon, node uses fetch)
  async _transport(payload) {
    const url = `${this.config.endpoint}/api/events/ingest`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  _startFlushing() {
    this._timer = setInterval(() => this.flush(), this.config.flushInterval);
  }

  _log(msg) {
    if (this.config.debug) console.log(`[Pulse] ${msg}`);
  }

  destroy() {
    this._destroyed = true;
    this.track('session_end', { _type: 'session_end' });
    this.flush();
    clearInterval(this._timer);
    this.plugins.forEach(p => p.destroy && p.destroy());
  }
}

module.exports = PulseCore;
