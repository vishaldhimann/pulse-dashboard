import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ReportingContextService } from '../../services/reporting-context.service';
import { finalize, distinctUntilChanged, switchMap } from 'rxjs';
import {
  AnalyticsPageComponent,
  MetricRowComponent,
  MetricTileComponent,
  ReportCardComponent,
  ReportGridComponent,
  SkeletonMetricRowComponent,
  SkeletonTableComponent
} from '../../ui';

@Component({
  selector: 'pulse-features',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsPageComponent,
    MetricRowComponent,
    MetricTileComponent,
    ReportCardComponent,
    ReportGridComponent,
    SkeletonTableComponent,
    SkeletonMetricRowComponent
  ],
  template: `
    <pulse-analytics-page
      title="Feature analytics"
      description="Cross-instance intensity and stickiness (DAU/MAU)—spot power users and cold tenants the way you would with engagement reports."
    >
      <pulse-report-grid>
        <pulse-report-card
          kicker="Segmentation"
          title="Feature heatmap"
          subtitle="Instance × feature counts. Darker cells = more events in the selected window."
        >
          <pulse-skeleton-table *ngIf="heatmapLoading" [cols]="7" [rows]="6"></pulse-skeleton-table>
          <div class="heatmap-table" *ngIf="!heatmapLoading && heatmapData.length">
            <table>
              <thead>
                <tr>
                  <th>Instance</th>
                  <th *ngFor="let f of features">{{ f }}</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let inst of instanceIds">
                  <td>{{ inst.substring(0, 8) }}…</td>
                  <td *ngFor="let f of features" [style.background]="getHeatColor(getCount(inst, f))" class="heat-cell">
                    {{ getCount(inst, f) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div *ngIf="!heatmapLoading && !heatmapData.length" class="chart-empty">
            <span class="material-symbols-outlined">grid_off</span>
            <span>No heatmap data for this window.</span>
          </div>
        </pulse-report-card>

        <pulse-report-card
          title="Stickiness"
          subtitle="Habitual use proxy: higher values mean more returning active users vs the monthly base."
        >
          <pulse-skeleton-metric-row *ngIf="stickinessLoading" [count]="3"></pulse-skeleton-metric-row>
          <ng-container *ngIf="!stickinessLoading && stickiness">
            <pulse-metric-row>
              <pulse-metric-tile label="DAU" [numberValue]="stickiness.dau"></pulse-metric-tile>
              <pulse-metric-tile label="MAU" [numberValue]="stickiness.mau"></pulse-metric-tile>
              <pulse-metric-tile
                label="Stickiness"
                [textValue]="stickiness.stickiness + '%'"
                hint="DAU ÷ MAU"
                variant="accent"
              ></pulse-metric-tile>
            </pulse-metric-row>
          </ng-container>
          <div *ngIf="!stickinessLoading && !stickiness" class="chart-empty">
            <span class="material-symbols-outlined">trending_flat</span>
            <span>Stickiness metrics are not available yet.</span>
          </div>
        </pulse-report-card>
      </pulse-report-grid>
    </pulse-analytics-page>
  `
})
export class FeaturesComponent implements OnInit {
  heatmapData: any[] = [];
  features: string[] = [];
  instanceIds: string[] = [];
  stickiness: any;
  heatmapLoading = true;
  stickinessLoading = true;
  private heatMap: Map<string, number> = new Map();

  private readonly reporting = inject(ReportingContextService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(private api: ApiService) {
    toObservable(this.reporting.days)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged(),
        switchMap(days => {
          this.heatmapLoading = true;
          this.heatMap.clear();
          return this.api.getHeatmap(days).pipe(finalize(() => (this.heatmapLoading = false)));
        })
      )
      .subscribe(data => {
        this.heatmapData = data;
        this.features = [...new Set(data.map((d: any) => d.featureName))].slice(0, 10) as string[];
        this.instanceIds = [...new Set(data.map((d: any) => d.instanceId))] as string[];
        data.forEach((d: any) => this.heatMap.set(`${d.instanceId}_${d.featureName}`, d.count));
      });
  }

  ngOnInit() {
    this.api
      .getStickiness()
      .pipe(finalize(() => (this.stickinessLoading = false)))
      .subscribe(d => (this.stickiness = d));
  }

  getCount(inst: string, feat: string): number {
    return this.heatMap.get(`${inst}_${feat}`) || 0;
  }

  getHeatColor(count: number): string {
    if (count === 0) return 'rgba(15, 118, 110, 0.05)';
    const max = this.heatmapData.length
      ? Math.max(...this.heatmapData.map((d: any) => d.count), 1)
      : 1;
    const intensity = Math.min(count / max, 1);
    return `rgba(15, 118, 110, ${0.15 + intensity * 0.55})`;
  }
}
