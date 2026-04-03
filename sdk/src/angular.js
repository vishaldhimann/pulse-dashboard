/**
 * PulseAngular — Angular-specific integration
 * Provides: providePulse(), PulseService, auto Router tracking, HTTP interceptor, ErrorHandler
 *
 * Usage in app.config.ts:
 *   import { providePulse } from '@pulse/sdk/angular';
 *   providers: [providePulse({ apiKey: '...', endpoint: '...' })]
 *
 * This file exports the configuration needed for Angular integration.
 * The actual Angular providers/services should be created as .ts files
 * in the host Angular project. This file provides the factory functions.
 */

const PulseBrowser = require('./browser');

/**
 * Creates a Pulse instance configured for Angular.
 * The host Angular app wraps this in an Injectable service.
 */
function createPulseForAngular(config) {
  const pulse = new PulseBrowser({
    ...config,
    // Angular handles routing, so disable auto page view tracking
    // (we'll use Angular Router events instead)
    trackPageViews: false
  });

  return pulse;
}

/**
 * Angular integration helpers — copy these into your Angular project
 * as TypeScript files. This is the reference implementation.
 */
const ANGULAR_SERVICE_TEMPLATE = `
import { Injectable, ErrorHandler, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { filter } from 'rxjs/operators';

// Import the browser SDK
// import PulseBrowser from '@pulse/sdk/browser';

@Injectable({ providedIn: 'root' })
export class PulseService {
  private pulse: any;

  constructor() {}

  init(config: any) {
    this.pulse = new (window as any).PulseBrowser(config);
  }

  track(feature: string, metadata?: any) { this.pulse?.track(feature, metadata); }
  trackError(feature: string, msg: string, meta?: any) { this.pulse?.trackError(feature, msg, meta); }
  trackPageView(page: string) { this.pulse?.trackPageView(page); }
  identify(userId: string) { this.pulse?.identify(userId); }
  destroy() { this.pulse?.destroy(); }
  get instance() { return this.pulse; }
}

// Router tracking — call in AppComponent constructor
export function setupRouterTracking(router: Router, pulse: PulseService) {
  router.events.pipe(
    filter(e => e instanceof NavigationEnd)
  ).subscribe((e: NavigationEnd) => {
    pulse.trackPageView(e.urlAfterRedirects);
  });
}

// HTTP Interceptor — auto-tracks API errors
export const pulseHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const start = Date.now();
  return next(req).pipe(
    tap({
      error: (err: HttpErrorResponse) => {
        const pulse = inject(PulseService);
        pulse.track('http_error', {
          _type: 'error',
          url: req.url,
          method: req.method,
          statusCode: err.status,
          errorMessage: err.message,
          responseTime: Date.now() - start
        });
      }
    })
  );
};

// Error Handler — catches all Angular errors
export class PulseErrorHandler implements ErrorHandler {
  constructor(private pulse: PulseService) {}
  handleError(error: any) {
    this.pulse.trackError('angular_error', error.message || String(error), {
      errorStack: error.stack?.substring(0, 500),
      errorSource: 'PulseErrorHandler'
    });
    console.error(error); // Still log to console
  }
}
`;

module.exports = { createPulseForAngular, ANGULAR_SERVICE_TEMPLATE };
