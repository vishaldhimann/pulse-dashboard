import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { finalize } from 'rxjs';
import { AnalyticsPageComponent, SkeletonFeedComponent, SpinnerComponent } from '../../ui';

@Component({
  selector: 'pulse-alerts',
  standalone: true,
  imports: [CommonModule, AnalyticsPageComponent, SkeletonFeedComponent, SpinnerComponent],
  template: `
    <pulse-analytics-page
      title="Alerts and churn"
      description="Operational and retention signals. Run detection to refresh scored churn-risk items—similar to GA’s automated insights list."
    >
      <div pageActions class="page-actions-group">
        <button
          type="button"
          class="btn btn-primary"
          [class.btn--busy]="detecting"
          (click)="runChurnDetection()"
          [disabled]="detecting"
        >
          <pulse-spinner *ngIf="detecting" size="sm"></pulse-spinner>
          <span *ngIf="!detecting" class="material-symbols-outlined btn__icon" aria-hidden="true">travel_explore</span>
          {{ detecting ? 'Detecting…' : 'Run churn detection' }}
        </button>
        <span *ngIf="churnResult" class="result-text-inline">+{{ churnResult.detected }} new</span>
      </div>

      <pulse-skeleton-feed *ngIf="alertsLoading" [linesCount]="6"></pulse-skeleton-feed>

      <div class="alerts-list" *ngIf="!alertsLoading">
        <div *ngFor="let alert of alerts" class="alert-card" [class]="'severity-' + alert.severity">
          <div class="alert-header">
            <span class="material-symbols-outlined alert-severity-icon" aria-hidden="true">{{
              alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'
            }}</span>
            <span class="alert-type">{{ alert.alertType }}</span>
            <span class="alert-time">{{ alert.createdAt | date:'short' }}</span>
          </div>
          <div class="alert-message">{{ alert.message }}</div>
          <div class="alert-actions" *ngIf="!alert.isResolved">
            <button type="button" class="btn btn-sm" (click)="resolve(alert._id)">
              <span class="material-symbols-outlined btn__icon btn__icon--sm" aria-hidden="true">check</span>
              Resolve
            </button>
          </div>
          <div class="alert-resolved" *ngIf="alert.isResolved">Resolved {{ alert.resolvedAt | date:'short' }}</div>
        </div>
        <div *ngIf="alerts.length === 0" class="empty-state">No active alerts</div>
      </div>
    </pulse-analytics-page>
  `
})
export class AlertsComponent implements OnInit {
  alerts: any[] = [];
  alertsLoading = true;
  detecting = false;
  churnResult: any;

  constructor(private api: ApiService, private socket: SocketService) {}

  ngOnInit() {
    this.loadAlerts();
    this.socket.onNewAlerts().subscribe(() => this.loadAlerts());
  }

  loadAlerts() {
    this.api
      .getAlerts(false)
      .pipe(finalize(() => (this.alertsLoading = false)))
      .subscribe(d => (this.alerts = d));
  }

  resolve(id: string) {
    this.api.resolveAlert(id).subscribe(() => this.loadAlerts());
  }

  runChurnDetection() {
    this.detecting = true;
    this.api.detectChurn().subscribe({
      next: d => {
        this.churnResult = d;
      },
      complete: () => {
        this.detecting = false;
        this.alertsLoading = true;
        this.loadAlerts();
      },
      error: () => {
        this.detecting = false;
      }
    });
  }
}
