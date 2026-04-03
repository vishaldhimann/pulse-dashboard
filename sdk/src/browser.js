/**
 * PulseBrowser — Frontend SDK with auto page views, error capture, sessions
 */
const PulseCore = require('./core');

class PulseBrowser extends PulseCore {
  constructor(config) {
    super(config);

    if (typeof window === 'undefined') {
      throw new Error('PulseBrowser must be used in a browser environment');
    }

    // Respect Do Not Track
    if (this.config.respectDoNotTrack && navigator.doNotTrack === '1') {
      this._log('Do Not Track enabled, tracking disabled');
      this._destroyed = true;
      return;
    }

    // Auto-track features
    if (this.config.trackErrors !== false) this._setupErrorTracking();
    if (this.config.trackPageViews !== false) this._setupPageViewTracking();
    if (this.config.trackSessions !== false) this._setupSessionTracking();

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });

    this.track('session_start', { _type: 'session_start' });
  }

  // Override transport to use sendBeacon when available
  async _transport(payload) {
    const url = `${this.config.endpoint}/api/events/ingest`;
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      if (sent) return;
    }

    // Fallback to fetch
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body, keepalive: true
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  _setupErrorTracking() {
    // JS runtime errors
    window.addEventListener('error', (event) => {
      this.track('js_error', {
        _type: 'error',
        errorMessage: event.message,
        errorSource: `${event.filename}:${event.lineno}:${event.colno}`,
        errorStack: event.error?.stack?.substring(0, 500),
        page: window.location.pathname
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || String(event.reason);
      this.track('unhandled_rejection', {
        _type: 'error',
        errorMessage: message,
        errorStack: event.reason?.stack?.substring(0, 500),
        page: window.location.pathname
      });
    });

    this._log('Error tracking enabled');
  }

  _setupPageViewTracking() {
    // Track initial page
    this.trackPageView(window.location.pathname);

    // Track SPA navigation (History API)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const self = this;

    history.pushState = function () {
      originalPushState.apply(this, arguments);
      self.trackPageView(window.location.pathname);
    };

    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      self.trackPageView(window.location.pathname);
    };

    window.addEventListener('popstate', () => {
      this.trackPageView(window.location.pathname);
    });

    this._log('Page view tracking enabled');
  }

  _setupSessionTracking() {
    // Track session end on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.track('session_pause', { _type: 'session_end' });
      } else {
        this.sessionStart = Date.now();
        this.track('session_resume', { _type: 'session_start' });
      }
    });

    this._log('Session tracking enabled');
  }

  // HTTP error tracking — call this from your HTTP interceptor
  trackHttpError(url, statusCode, method = 'GET', metadata = {}) {
    return this.track('http_error', {
      _type: 'error',
      url, statusCode, method,
      page: window.location.pathname,
      ...metadata
    });
  }
}

module.exports = PulseBrowser;
