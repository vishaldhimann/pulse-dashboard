import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { finalize } from 'rxjs';
import { AnalyticsPageComponent, ReportCardComponent, SkeletonTableComponent } from '../../ui';

@Component({
  selector: 'pulse-instances',
  standalone: true,
  imports: [CommonModule, AnalyticsPageComponent, ReportCardComponent, SkeletonTableComponent],
  template: `
    <pulse-analytics-page
      title="Instance health"
      description="Per-tenant volume, error rate, heartbeat freshness, and inactivity—one table, GA-style density and scanability."
    >
      <pulse-report-card
        title="Instance registry"
        subtitle="Use error rate and inactive days to prioritize customer success or engineering outreach."
      >
        <pulse-skeleton-table *ngIf="loading" [cols]="9" [rows]="8"></pulse-skeleton-table>
        <table class="data-table" *ngIf="!loading && instances.length">
          <thead>
            <tr>
              <th>Name</th>
              <th>Region</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Events today</th>
              <th>Errors</th>
              <th>Error rate</th>
              <th>Last heartbeat</th>
              <th>Inactive</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let i of instances" [class]="'row-' + i.status">
              <td>{{ getInstanceName(i.instanceId) }}</td>
              <td>{{ i.region }}</td>
              <td><span class="tier-badge">{{ i.clientTier }}</span></td>
              <td>
                <span
                  class="status-chip"
                  [class.status-chip--ok]="i.status === 'healthy'"
                  [class.status-chip--warn]="i.status === 'degraded'"
                  [class.status-chip--bad]="i.status === 'down' || i.status === 'unhealthy'"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">{{
                    i.status === 'healthy' ? 'check_circle' : i.status === 'degraded' ? 'warning' : 'error'
                  }}</span>
                  {{ i.status }}
                </span>
              </td>
              <td>{{ i.eventsToday | number }}</td>
              <td [class.error-text]="i.errorsToday > 0">{{ i.errorsToday }}</td>
              <td [class.error-text]="i.errorRate > 5">{{ i.errorRate }}%</td>
              <td>{{ i.lastHeartbeat | date:'short' }}</td>
              <td [class.error-text]="i.inactiveDays >= 3">{{ i.inactiveDays }}d</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="!loading && !instances.length" class="chart-empty">
          <span class="material-symbols-outlined">dns</span>
          <span>No instance health rows returned.</span>
        </div>
      </pulse-report-card>
    </pulse-analytics-page>
  `
})
export class InstancesComponent implements OnInit {
  instances: any[] = [];
  loading = true;
  instanceNames: Map<string, string> = new Map();

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getInstances().subscribe(data => {
      data.forEach((i: any) => this.instanceNames.set(i.instanceId, i.name));
    });
    this.api
      .getInstanceHealth()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe(d => (this.instances = d));
  }

  getInstanceName(id: string): string {
    return this.instanceNames.get(id) || id.substring(0, 8);
  }
}
