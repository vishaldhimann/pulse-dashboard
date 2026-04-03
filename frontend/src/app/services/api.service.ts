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
  getHeatmap(days = 30): Observable<any> { return this.http.get(`${BASE}/analytics/heatmap?days=${days}`); }
  getStickiness(): Observable<any> { return this.http.get(`${BASE}/analytics/stickiness`); }
  getFunnel(steps: string): Observable<any> { return this.http.get(`${BASE}/analytics/funnel?steps=${steps}`); }

  // Instances
  getInstances(): Observable<any> { return this.http.get(`${BASE}/instances`); }
  getInstanceHealth(): Observable<any> { return this.http.get(`${BASE}/instances/health`); }

  // Alerts
  getAlerts(resolved = false): Observable<any> { return this.http.get(`${BASE}/alerts?resolved=${resolved}`); }
  resolveAlert(id: string): Observable<any> { return this.http.patch(`${BASE}/alerts/${id}/resolve`, {}); }
  detectChurn(): Observable<any> { return this.http.post(`${BASE}/alerts/detect-churn`, {}); }

  // Business Intelligence
  getLoanDemand(days = 30): Observable<any> { return this.http.get(`${BASE}/business-intel/loan-demand?days=${days}`); }
  getApplicationFunnel(days = 30): Observable<any> { return this.http.get(`${BASE}/business-intel/application-funnel?days=${days}`); }
  getApprovalRates(days = 30): Observable<any> { return this.http.get(`${BASE}/business-intel/approval-rates?days=${days}`); }
  getProcessingTime(days = 30): Observable<any> { return this.http.get(`${BASE}/business-intel/processing-time?days=${days}`); }
  getCreditDistribution(days = 30): Observable<any> { return this.http.get(`${BASE}/business-intel/credit-distribution?days=${days}`); }
  getOfferAcceptance(days = 30): Observable<any> { return this.http.get(`${BASE}/business-intel/offer-acceptance?days=${days}`); }
  getServiceHealth(hours = 24): Observable<any> { return this.http.get(`${BASE}/business-intel/service-health?hours=${hours}`); }

  // Observability
  getErrors(hours = 24): Observable<any> { return this.http.get(`${BASE}/observability/errors?hours=${hours}`); }
  getErrorTimeline(hours = 24): Observable<any> { return this.http.get(`${BASE}/observability/error-timeline?hours=${hours}`); }
  getUptime(days = 30): Observable<any> { return this.http.get(`${BASE}/observability/uptime?days=${days}`); }
  getSystemMetrics(instanceId: string, hours = 24): Observable<any> { return this.http.get(`${BASE}/observability/system-metrics?instanceId=${instanceId}&hours=${hours}`); }
  getErrorsByInstance(hours = 24): Observable<any> { return this.http.get(`${BASE}/observability/errors-by-instance?hours=${hours}`); }

  // AI
  getInsights(): Observable<any> { return this.http.post(`${BASE}/ai/insights`, {}); }
  askPulse(question: string): Observable<any> { return this.http.post(`${BASE}/ai/chat`, { question }); }
  predictChurn(instanceId: string): Observable<any> { return this.http.post(`${BASE}/ai/churn-predict`, { instanceId }); }

  // Events
  getRecentEvents(limit = 20): Observable<any> { return this.http.get(`${BASE}/events?limit=${limit}`); }
  getEventsByType(eventType: string, limit = 50): Observable<any> { return this.http.get(`${BASE}/events?eventType=${eventType}&limit=${limit}`); }
}
