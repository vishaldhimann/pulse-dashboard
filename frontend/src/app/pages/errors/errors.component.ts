import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { finalize, tap } from 'rxjs';
import Chart from 'chart.js/auto';
import type { TooltipItem } from 'chart.js';
import { barDatasetStyle, horizontalBarOptions, lineTrendOptions, palette } from '../../chart-defaults';
import {
  AnalyticsPageComponent,
  ChartSkeletonComponent,
  MetricRowComponent,
  MetricTileComponent,
  ReportCardComponent,
  ReportGridComponent,
  SkeletonMetricRowComponent,
  SpinnerComponent
} from '../../ui';

@Component({
  selector: 'pulse-errors',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsPageComponent,
    MetricRowComponent,
    MetricTileComponent,
    ReportCardComponent,
    ReportGridComponent,
    ChartSkeletonComponent,
    SkeletonMetricRowComponent,
    SpinnerComponent
  ],
  template: `
    <pulse-analytics-page
      title="Error monitoring"
      description="Last 24 hours: trend line, blast radius by instance, and grouped fingerprints—structured like an GA anomaly + detail drilldown."
    >
      <pulse-skeleton-metric-row *ngIf="errorsKpiLoading" [count]="3"></pulse-skeleton-metric-row>
      <pulse-metric-row *ngIf="!errorsKpiLoading">
        <pulse-metric-tile label="Errors (24h)" [numberValue]="totalErrors" variant="danger"></pulse-metric-tile>
        <pulse-metric-tile label="Unique fingerprints" [numberValue]="uniqueErrors"></pulse-metric-tile>
        <pulse-metric-tile label="Affected users (reach)" [numberValue]="affectedUsers"></pulse-metric-tile>
      </pulse-metric-row>

      <pulse-report-grid>
        <pulse-report-card
          title="Error timeline"
          subtitle="Hourly counts. Steep ramps often align with deploys, incidents, or dependency outages."
        >
          <pulse-chart-skeleton *ngIf="timelineLoading"></pulse-chart-skeleton>
          <div class="chart-host" *ngIf="!timelineLoading">
            <canvas #timelineChart></canvas>
          </div>
        </pulse-report-card>
        <pulse-report-card
          title="Errors by instance"
          subtitle="Where failures concentrate—useful to separate noisy tenants from platform regressions."
        >
          <pulse-chart-skeleton *ngIf="instanceChartLoading"></pulse-chart-skeleton>
          <div class="chart-host" *ngIf="!instanceChartLoading">
            <canvas #instanceChart></canvas>
          </div>
        </pulse-report-card>
      </pulse-report-grid>

      <pulse-report-card
        title="Error groups"
        subtitle="Fingerprinted message, source, and blast radius. Start triage from the highest volume."
        [dense]="true"
      >
        <div class="loading-inline loading-inline--pad" *ngIf="errorsListLoading">
          <pulse-spinner size="sm"></pulse-spinner>
          Loading error fingerprints…
        </div>
        <ng-container *ngIf="!errorsListLoading">
          <div *ngFor="let err of errors" class="error-group">
            <div class="error-header">
              <span
                class="error-severity-icon material-symbols-outlined"
                [class.error-severity-icon--high]="err.count > 10"
                aria-hidden="true"
              >{{ err.count > 10 ? 'error' : 'warning' }}</span>
              <span class="error-message">{{ err.errorMessage || 'Unknown error' }}</span>
              <span class="error-count">{{ err.count }}×</span>
            </div>
            <div class="error-details">
              <span>{{ err.errorSource || err.service || '' }}</span>
              <span>{{ err.affectedUsers }} users</span>
              <span>{{ err.affectedInstances }} instances</span>
              <span>Last: {{ err.lastSeen | date:'short' }}</span>
            </div>
          </div>
          <div *ngIf="errors.length === 0" class="chart-empty">
            <span class="material-symbols-outlined">check_circle</span>
            <span>No grouped errors in the last 24 hours.</span>
          </div>
        </ng-container>
      </pulse-report-card>
    </pulse-analytics-page>
  `
})
export class ErrorsComponent implements OnInit, OnDestroy {
  @ViewChild('timelineChart') timelineRef: ElementRef;
  @ViewChild('instanceChart') instanceRef: ElementRef;

  errors: any[] = [];
  totalErrors = 0;
  uniqueErrors = 0;
  affectedUsers = 0;

  errorsKpiLoading = true;
  errorsListLoading = true;
  timelineLoading = true;
  instanceChartLoading = true;

  private timelineData: any[] = [];
  private instanceData: any[] = [];

  private timelineChart?: Chart;
  private instanceChart?: Chart;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api
      .getErrors(24)
      .pipe(
        tap(data => {
          this.errors = data;
          this.totalErrors = data.reduce((s: number, e: any) => s + e.count, 0);
          this.uniqueErrors = data.length;
          this.affectedUsers = data.reduce((s: number, e: any) => s + e.affectedUsers, 0);
        }),
        finalize(() => {
          this.errorsKpiLoading = false;
          this.errorsListLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe();

    this.api
      .getErrorTimeline(24)
      .pipe(
        tap(d => (this.timelineData = d || [])),
        finalize(() => {
          this.timelineLoading = false;
          this.cdr.detectChanges();
          queueMicrotask(() => this.buildTimelineChart());
        })
      )
      .subscribe();

    this.api
      .getErrorsByInstance(24)
      .pipe(
        tap(d => (this.instanceData = d || [])),
        finalize(() => {
          this.instanceChartLoading = false;
          this.cdr.detectChanges();
          queueMicrotask(() => this.buildInstanceChart());
        })
      )
      .subscribe();
  }

  private buildTimelineChart() {
    this.timelineChart?.destroy();
    const el = this.timelineRef?.nativeElement;
    if (!el) return;
    const data = this.timelineData;
    const totals = data.map((d: any) => d.count);
    const sum = totals.reduce((s: number, n: number) => s + n, 0);
    this.timelineChart = new Chart(el, {
      type: 'line',
      data: {
        labels: data.map((d: any) => d.hour?.substring(11, 16)),
        datasets: [
          {
            label: 'Errors',
            data: totals,
            borderColor: palette.rose,
            backgroundColor: 'rgba(244, 63, 94, 0.16)',
            fill: true,
            borderWidth: 2.5,
            tension: 0.35
          }
        ]
      },
      options: lineTrendOptions({
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              footer: (items: TooltipItem<'line'>[]) => {
                const v = Number(items[0]?.raw);
                const pct = sum > 0 ? ((v / sum) * 100).toFixed(1) : '0';
                return `${pct}% of errors in this 24h window`;
              }
            }
          }
        }
      })
    });
  }

  private buildInstanceChart() {
    this.instanceChart?.destroy();
    const el = this.instanceRef?.nativeElement;
    if (!el) return;
    const data = this.instanceData;
    const vals = data.map((d: any) => d.errorCount);
    const sum = vals.reduce((s: number, n: number) => s + n, 0);
    this.instanceChart = new Chart(el, {
      type: 'bar',
      data: {
        labels: data.map((d: any) => d.instanceId?.substring(0, 8)),
        datasets: [
          {
            label: 'Errors',
            data: vals,
            backgroundColor: palette.amber,
            ...barDatasetStyle
          }
        ]
      },
      options: horizontalBarOptions({
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              footer: (items: TooltipItem<'bar'>[]) => {
                const v = Number(items[0]?.raw);
                const pct = sum > 0 ? ((v / sum) * 100).toFixed(1) : '0';
                return `${pct}% of errors across instances shown`;
              }
            }
          }
        }
      })
    });
  }

  ngOnDestroy() {
    this.timelineChart?.destroy();
    this.instanceChart?.destroy();
  }
}
