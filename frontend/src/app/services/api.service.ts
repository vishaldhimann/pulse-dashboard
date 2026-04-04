import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE = `${environment.apiBaseUrl.replace(/\/$/, '')}/api`;

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // Analytics
  getSummary(): Observable<any> { return this.http.get(`${BASE}/analytics/summary`); }
  getTopFeatures(days = 30): Observable<any> { return this.http.get(`${BASE}/analytics/top-features?days=${days}`); }
  getDau(days = 30): Observable<any> { return this.http.get(`${BASE}/analytics/dau?days=${days}`); }
  getEventTypeBreakdown(days = 30): Observable<any> { return this.http.get(`${BASE}/analytics/event-type-breakdown?days=${days}`); }
  getHeatmap(days = 30): Observable<any> { return this.http.get(`${BASE}/analytics/heatmap?days=${days}`); }
  getStickiness(): Observable<any> { return this.http.get(`${BASE}/analytics/stickiness`); }
  getFunnel(steps: string): Observable<any> { return this.http.get(`${BASE}/analytics/funnel?steps=${steps}`); }
  getPageTimeSummary(): Observable<any> { return this.http.get(`${BASE}/analytics/page-time-summary`); }

  // Events — flexible query
  getEvents(params: Record<string, string | number> = {}): Observable<any> {
    const qs = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    return this.http.get(`${BASE}/events${qs ? '?' + qs : ''}`);
  }
  getRecentEvents(limit = 50): Observable<any> { return this.http.get(`${BASE}/events?limit=${limit}`); }
  getEventsByType(eventType: string, limit = 200): Observable<any> { return this.http.get(`${BASE}/events?eventType=${eventType}&limit=${limit}`); }

  // Instances
  getInstances(): Observable<any> { return this.http.get(`${BASE}/instances`); }
  getInstanceHealth(): Observable<any> { return this.http.get(`${BASE}/instances/health`); }

  // Alerts
  getAlerts(resolved = false): Observable<any> { return this.http.get(`${BASE}/alerts?resolved=${resolved}`); }
  resolveAlert(id: string): Observable<any> { return this.http.patch(`${BASE}/alerts/${id}/resolve`, {}); }

  // Observability
  getErrors(hours = 24): Observable<any> { return this.http.get(`${BASE}/observability/errors?hours=${hours}`); }
  getErrorTimeline(hours = 24): Observable<any> { return this.http.get(`${BASE}/observability/error-timeline?hours=${hours}`); }
  getErrorsByInstance(hours = 24): Observable<any> { return this.http.get(`${BASE}/observability/errors-by-instance?hours=${hours}`); }
}
