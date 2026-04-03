import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { finalize } from 'rxjs';
import {
  AnalyticsPageComponent,
  ReportCardComponent,
  SkeletonTableComponent,
  SpinnerComponent
} from '../../ui';
import { palette } from '../../chart-defaults';

@Component({
  selector: 'pulse-uptime',
  standalone: true,
  imports: [CommonModule, AnalyticsPageComponent, ReportCardComponent, SkeletonTableComponent, SpinnerComponent],
  template: `
    <pulse-analytics-page
      title="Uptime and status"
      description="Heartbeat health and a compact daily uptime strip per instance—read it like a GA timeline explorer."
    >
      <pulse-report-card
        title="Status board"
        subtitle="Events and errors today with last-seen telemetry."
      >
        <pulse-skeleton-table *ngIf="healthLoading" [cols]="5" [rows]="6"></pulse-skeleton-table>
        <table class="data-table" *ngIf="!healthLoading && health.length">
          <thead>
            <tr><th>Instance</th><th>Status</th><th>Events today</th><th>Errors</th><th>Last heartbeat</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of health">
              <td>{{ getInstanceName(h.instanceId) }}</td>
              <td>
                <span
                  class="status-chip"
                  [class.status-chip--ok]="h.status === 'healthy'"
                  [class.status-chip--warn]="h.status === 'degraded'"
                  [class.status-chip--bad]="h.status !== 'healthy' && h.status !== 'degraded'"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">{{
                    h.status === 'healthy' ? 'check_circle' : h.status === 'degraded' ? 'schedule' : 'error'
                  }}</span>
                  {{ h.status === 'healthy' ? 'Up' : h.status === 'degraded' ? 'Degraded' : 'Down' }}
                </span>
              </td>
              <td>{{ h.eventsToday | number }}</td>
              <td [class.error-text]="h.errorsToday > 0">{{ h.errorsToday }}</td>
              <td>{{ h.lastHeartbeat | date:'medium' }}</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="!healthLoading && !health.length" class="chart-empty">
          <span class="material-symbols-outlined">monitor_heart</span>
          <span>No heartbeat rows yet.</span>
        </div>
      </pulse-report-card>

      <pulse-report-card
        title="Uptime by day"
        subtitle="Each block is one day. Green &gt;99%, amber 95–99%, red &lt;95%. Hover for the exact percentage."
      >
        <div class="loading-inline loading-inline--pad" *ngIf="uptimeLoading">
          <pulse-spinner size="sm"></pulse-spinner>
          Loading uptime series…
        </div>
        <ng-container *ngIf="!uptimeLoading">
          <div *ngFor="let inst of uptimeByInstance | keyvalue" class="uptime-row">
            <span class="uptime-label">{{ inst.key.substring(0, 8) }}</span>
            <div class="uptime-bar">
              <span
                *ngFor="let day of inst.value"
                class="uptime-block"
                [style.background]="day.uptimePercent > 99 ? uptimeOk : day.uptimePercent > 95 ? uptimeWarn : uptimeBad"
                [title]="day.date + ': ' + day.uptimePercent + '%'"
              ></span>
            </div>
          </div>
          <div *ngIf="!uptimeLoading && (uptimeByInstance | keyvalue).length === 0" class="chart-empty">
            <span class="material-symbols-outlined">calendar_view_week</span>
            <span>No daily uptime samples for this range.</span>
          </div>
        </ng-container>
      </pulse-report-card>
    </pulse-analytics-page>
  `
})
export class UptimeComponent implements OnInit {
  readonly uptimeOk = palette.teal;
  readonly uptimeWarn = palette.amber;
  readonly uptimeBad = palette.rose;

  health: any[] = [];
  healthLoading = true;
  uptimeLoading = true;
  uptimeByInstance: Map<string, any[]> = new Map();
  instanceNames: Map<string, string> = new Map();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getInstances().subscribe(data =>
      data.forEach((i: any) => this.instanceNames.set(i.instanceId, i.name))
    );
    this.api
      .getInstanceHealth()
      .pipe(finalize(() => (this.healthLoading = false)))
      .subscribe(d => (this.health = d));
    this.api
      .getUptime(30)
      .pipe(finalize(() => (this.uptimeLoading = false)))
      .subscribe(data => {
        const grouped = new Map<string, any[]>();
        data.forEach((d: any) => {
          if (!grouped.has(d.instanceId)) grouped.set(d.instanceId, []);
          grouped.get(d.instanceId)!.push(d);
        });
        this.uptimeByInstance = grouped;
      });
  }

  getInstanceName(id: string): string {
    return this.instanceNames.get(id) || id.substring(0, 8);
  }
}
