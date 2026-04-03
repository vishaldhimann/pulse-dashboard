/**
 * PulseNode — Backend SDK with Express middleware, heartbeat, service tracking
 */
const PulseCore = require('./core');
const os = require('os');

class PulseNode extends PulseCore {
  constructor(config) {
    super(config);
    this._heartbeatTimer = null;

    // Start heartbeat
    const interval = config.observability?.heartbeatInterval || 60000;
    this._startHeartbeat(interval);
  }

  _startHeartbeat(interval) {
    const sendHeartbeat = () => {
      const mem = process.memoryUsage();
      this.trackHeartbeat({
        uptime: Math.floor(process.uptime()),
        memoryUsage: Math.round((mem.heapUsed / mem.heapTotal) * 100),
        cpuLoad: Math.round(os.loadavg()[0] * 100) / 100,
        activeConnections: 0, // Override in middleware
        nodeVersion: process.version,
        status: 'healthy'
      });
    };

    sendHeartbeat();
    this._heartbeatTimer = setInterval(sendHeartbeat, interval);
    this._log('Heartbeat started');
  }

  /**
   * Express middleware — auto-tracks every request
   * Usage: app.use(pulse.middleware())
   */
  middleware(options = {}) {
    const self = this;
    const excludePaths = options.excludePaths || ['/health', '/metrics', '/api/health'];
    const captureHeaders = options.captureHeaders || [];

    return (req, res, next) => {
      // Skip excluded paths
      if (excludePaths.some(p => req.path.startsWith(p))) return next();

      const start = Date.now();

      // Attach pulse to request for manual tracking in handlers
      req.pulse = self;

      // Track on response finish
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        const statusCode = res.statusCode;
        const isError = statusCode >= 400;

        // Extract selected headers
        const headers = {};
        captureHeaders.forEach(h => {
          if (req.headers[h]) headers[h] = req.headers[h];
        });

        if (isError) {
          self.track('route_error', {
            _type: statusCode >= 500 ? 'api_error' : 'error',
            method: req.method,
            route: req.route?.path || req.path,
            statusCode,
            responseTime,
            errorMessage: res.statusMessage,
            ...headers
          });
        } else {
          self.trackApiCall(
            'self', req.route?.path || req.path,
            responseTime, statusCode,
            { method: req.method, ...headers }
          );
        }
      });

      next();
    };
  }

  /**
   * Downstream service tracking middleware
   * Wraps axios/fetch calls to track outgoing requests
   */
  wrapAxios(axios) {
    const self = this;
    const serviceNames = this.config.observability?.serviceNames || {};

    axios.interceptors.request.use(config => {
      config._pulseStart = Date.now();
      return config;
    });

    axios.interceptors.response.use(
      (response) => {
        const rt = Date.now() - (response.config._pulseStart || Date.now());
        const url = response.config.url || '';
        const service = this._resolveServiceName(url, serviceNames);

        self.trackApiCall(service, url, rt, response.status, {
          method: response.config.method?.toUpperCase()
        });
        return response;
      },
      (error) => {
        const rt = Date.now() - (error.config?._pulseStart || Date.now());
        const url = error.config?.url || '';
        const service = this._resolveServiceName(url, serviceNames);
        const status = error.response?.status || 0;

        self.trackApiError(service, status, {
          method: error.config?.method?.toUpperCase(),
          errorMessage: error.message,
          responseTime: rt,
          route: url
        });
        return Promise.reject(error);
      }
    );

    this._log('Axios interceptors attached');
  }

  _resolveServiceName(url, serviceNames) {
    for (const [pattern, name] of Object.entries(serviceNames)) {
      if (url.includes(pattern)) return name;
    }
    // Try to extract from URL path
    try {
      const path = new URL(url).pathname.split('/')[1];
      return path || 'unknown';
    } catch {
      return url.split('/')[1] || 'unknown';
    }
  }

  destroy() {
    clearInterval(this._heartbeatTimer);
    super.destroy();
  }
}

module.exports = PulseNode;
