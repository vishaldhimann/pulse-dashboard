import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  inject,
  DestroyRef
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { ReportingContextService } from '../../services/reporting-context.service';
import { Subscription, finalize, distinctUntilChanged, switchMap } from 'rxjs';
import Chart from 'chart.js/auto';
import type { TooltipItem } from 'chart.js';
import { barDatasetStyle, doughnutOptions, horizontalBarOptions, palette } from '../../chart-defaults';
import {
  AnalyticsPageComponent,
  ChartSkeletonComponent,
  MetricRowComponent,
  MetricTileComponent,
  ReportCardComponent,
  ReportGridComponent,
  SkeletonFeedComponent,
  SkeletonMetricRowComponent,
  SpinnerComponent
} from '../../ui';

@Component({
  selector: 'pulse-overview',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsPageComponent,
    MetricRowComponent,
    MetricTileComponent,
    ReportCardComponent,
    ReportGridComponent,
    SkeletonMetricRowComponent,
    ChartSkeletonComponent,
    SkeletonFeedComponent,
    SpinnerComponent
  ],
  template: `
    <pulse-analytics-page
      title="Overview"
      description="Traffic, engagement, and live signals across instances. Compare time-on-page, feature usage, and event mix like a primary GA report."
    >
      <span pageActions class="ga-chip">
        <span class="loading-inline" *ngIf="feedBootLoading">
          <pulse-spinner size="sm"></pulse-spinner>
          Connecting…
        </span>
        <ng-container *ngIf="!feedBootLoading">Realtime connection</ng-container>
      </span>

      <pulse-skeleton-metric-row *ngIf="summaryLoading" [count]="5"></pulse-skeleton-metric-row>
      <pulse-metric-row *ngIf="!summaryLoading">
        <pulse-metric-tile label="Event volume (all time)" [numberValue]="summary?.totalEvents ?? null" hint="Recorded events"></pulse-metric-tile>
        <pulse-metric-tile
          label="Events today"
          [numberValue]="summary?.todayEvents ?? null"
          [comparison]="todayShareOfWeek"
          comparisonTone="neutral"
        ></pulse-metric-tile>
        <pulse-metric-tile label="Instances" [numberValue]="summary?.totalInstances ?? null" comparison="Distinct tenants" comparisonTone="neutral"></pulse-metric-tile>
        <pulse-metric-tile label="Users" [numberValue]="summary?.totalUsers ?? null" comparison="Hashed visitor keys" comparisonTone="neutral"></pulse-metric-tile>
        <pulse-metric-tile
          label="Errors today"
          [numberValue]="summary?.errorsToday ?? null"
          variant="danger"
          [comparison]="errorDensity"
          [comparisonTone]="errorComparisonTone"
        ></pulse-metric-tile>
      </pulse-metric-row>

      <pulse-report-card
        kicker="Exploration"
        title="Time on page"
        subtitle="Total and average seconds per route (fixed sample: last 500 events — independent of the date control). Hover a bar for visits, clicks, and averages."
      >
        <pulse-chart-skeleton *ngIf="eventsChartsLoading"></pulse-chart-skeleton>
        <div class="chart-host chart-panel" *ngIf="!eventsChartsLoading && hasPageTimeData">
          <canvas #pageTimeChart></canvas>
        </div>
        <div *ngIf="!eventsChartsLoading && !hasPageTimeData" class="chart-empty">
          <span class="material-symbols-outlined">bar_chart</span>
          <span>Not enough page-time events in this window to chart.</span>
        </div>
      </pulse-report-card>

      <pulse-report-grid>
        <pulse-report-card
          kicker="Ranked breakdown"
          title="Top features and pages"
          subtitle="Highest event counts in the selected window — prioritize UX, perf, and reliability where traffic concentrates."
        >
          <pulse-chart-skeleton *ngIf="featuresChartLoading"></pulse-chart-skeleton>
          <div class="chart-host chart-panel" *ngIf="!featuresChartLoading && hasFeaturesData">
            <canvas #featuresChart></canvas>
          </div>
          <div *ngIf="!featuresChartLoading && !hasFeaturesData" class="chart-empty">
            <span class="material-symbols-outlined">insights</span>
            <span>No feature usage data for this range yet.</span>
          </div>
        </pulse-report-card>
        <pulse-report-card
          kicker="Composition"
          title="Event mix"
          subtitle="Share of each event type in the sampled buffer — balance between views, APIs, and errors."
        >
          <pulse-chart-skeleton *ngIf="eventsChartsLoading"></pulse-chart-skeleton>
          <div class="chart-host chart-panel" *ngIf="!eventsChartsLoading && hasEventMixData">
            <canvas #eventTypeChart></canvas>
          </div>
          <div *ngIf="!eventsChartsLoading && !hasEventMixData" class="chart-empty">
            <span class="material-symbols-outlined">donut_large</span>
            <span>No event type breakdown yet.</span>
          </div>
        </pulse-report-card>
      </pulse-report-grid>

      <pulse-report-card
        title="Route transitions"
        subtitle="Recent navigations with dwell time and clicks on the previous screen."
        [dense]="true"
      >
        <pulse-skeleton-feed *ngIf="feedBootLoading" [linesCount]="6"></pulse-skeleton-feed>
        <ng-container *ngIf="!feedBootLoading">
          <div class="route-changes">
            <div *ngFor="let rc of routeChanges" class="route-change-item">
              <span class="rc-time">{{ rc.timestamp | date:'HH:mm:ss' }}</span>
              <span class="rc-from">{{ shortenRoute(rc.metadata?.fromRoute) }}</span>
              <span class="rc-arrow">→</span>
              <span class="rc-to">{{ shortenRoute(rc.metadata?.toRoute) }}</span>
              <span class="rc-duration">{{ rc.metadata?.timeOnPreviousRouteSeconds }}s</span>
              <span class="rc-activities">{{ rc.metadata?.activitiesOnPreviousRoute }} clicks</span>
            </div>
            <div *ngIf="routeChanges.length === 0" class="feed-empty">No route changes yet</div>
          </div>
        </ng-container>
      </pulse-report-card>

      <pulse-report-card
        title="Live event stream"
        subtitle="Latest telemetry as it arrives—same mental model as GA’s realtime view."
        [dense]="true"
      >
        <pulse-skeleton-feed *ngIf="feedBootLoading" [linesCount]="8"></pulse-skeleton-feed>
        <ng-container *ngIf="!feedBootLoading">
          <div class="event-feed">
            <div *ngFor="let evt of realtimeEvents" class="feed-item" [class]="'feed-' + evt.eventType">
              <span class="feed-time">{{ evt.timestamp | date:'HH:mm:ss' }}</span>
              <span class="feed-type" [class]="'type-' + evt.eventType">{{ evt.eventType }}</span>
              <span class="feed-feature">{{ evt.featureName }}</span>
              <span class="feed-meta" *ngIf="evt.eventType === 'page_time'">{{ evt.metadata?.timeSpentSeconds }}s on {{ shortenRoute(evt.metadata?.route) }} · {{ evt.metadata?.activitiesOnPage }} clicks</span>
              <span class="feed-meta" *ngIf="evt.eventType === 'route_change'">{{ shortenRoute(evt.metadata?.fromRoute) }} → {{ shortenRoute(evt.metadata?.toRoute) }} ({{ evt.metadata?.timeOnPreviousRouteSeconds }}s)</span>
              <span class="feed-meta" *ngIf="evt.eventType === 'api_call'">{{ evt.metadata?.service }} {{ evt.metadata?.statusCode }} ({{ evt.metadata?.responseTime }}ms)</span>
              <span class="feed-meta" *ngIf="evt.eventType === 'error'">{{ evt.metadata?.errorMessage?.substring(0, 80) }}</span>
              <span class="feed-meta" *ngIf="evt.eventType === 'interaction'">{{ evt.metadata?.label?.substring(0, 40) }} on {{ shortenRoute(evt.metadata?.route) }}</span>
              <span class="feed-meta" *ngIf="evt.eventType === 'pageview'">{{ shortenRoute(evt.metadata?.route || evt.metadata?.pageName) }}</span>
            </div>
            <div *ngIf="realtimeEvents.length === 0" class="feed-empty">Waiting for events…</div>
          </div>
        </ng-container>
      </pulse-report-card>
    </pulse-analytics-page>
  `
})
export class OverviewComponent implements OnInit, OnDestroy {
  @ViewChild('pageTimeChart') pageTimeChartRef: ElementRef;
  @ViewChild('featuresChart') featuresChartRef: ElementRef;
  @ViewChild('eventTypeChart') eventTypeChartRef: ElementRef;

  summary: any = {};
  summaryLoading = true;
  eventsChartsLoading = true;
  featuresChartLoading = true;
  feedBootLoading = true;

  hasPageTimeData = false;
  hasEventMixData = false;
  hasFeaturesData = false;

  realtimeEvents: any[] = [];
  routeChanges: any[] = [];

  private sortedRoutes: [string, { totalTime: number; visits: number; activities: number }][] = [];
  private typeEntries: [string, number][] = [];
  private topFeaturesRows: any[] = [];

  private subs: Subscription[] = [];
  private pageTimeChart?: Chart;
  private eventMixChart?: Chart;
  private featuresChart?: Chart;

  private readonly reporting = inject(ReportingContextService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private api: ApiService,
    private socket: SocketService,
    private cdr: ChangeDetectorRef
  ) {
    toObservable(this.reporting.days)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged(),
        switchMap(days => {
          this.featuresChartLoading = true;
          this.cdr.markForCheck();
          return this.api.getTopFeatures(days).pipe(
            finalize(() => {
              this.featuresChartLoading = false;
              this.cdr.detectChanges();
              queueMicrotask(() => this.buildFeaturesChart());
            })
          );
        })
      )
      .subscribe(data => {
        this.topFeaturesRows = data || [];
        this.hasFeaturesData = this.topFeaturesRows.length > 0;
      });
  }

  get todayShareOfWeek(): string {
    const t = this.summary?.todayEvents;
    const w = this.summary?.weekEvents;
    if (t == null || w == null || w === 0) return '';
    return `${((t / w) * 100).toFixed(1)}% of last 7 days total`;
  }

  get errorDensity(): string {
    const e = this.summary?.errorsToday;
    const t = this.summary?.todayEvents;
    if (e == null || t == null) return '';
    if (t === 0) return e > 0 ? 'No events today — errors still recorded' : '';
    return `${((e / t) * 1000).toFixed(2)} per 1k events today`;
  }

  get errorComparisonTone(): 'positive' | 'negative' | 'neutral' {
    const e = this.summary?.errorsToday ?? 0;
    return e > 0 ? 'negative' : 'neutral';
  }

  ngOnInit() {
    this.api
      .getSummary()
      .pipe(
        finalize(() => {
          this.summaryLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(d => (this.summary = d));

    this.api
      .getRecentEvents(50)
      .pipe(
        finalize(() => {
          this.feedBootLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(d => {
        this.realtimeEvents = d.events || [];
        this.routeChanges = this.realtimeEvents.filter((e: any) => e.eventType === 'route_change');
      });

    this.api
      .getRecentEvents(500)
      .pipe(
        finalize(() => {
          this.eventsChartsLoading = false;
          this.cdr.detectChanges();
          queueMicrotask(() => this.buildPageTimeAndEventMixCharts());
        })
      )
      .subscribe(d => this.processEvents500(d));

    this.subs.push(
      this.socket.onNewEvents().subscribe(data => {
        if (data.latest) {
          this.realtimeEvents.unshift(data.latest);
          if (this.realtimeEvents.length > 50) this.realtimeEvents.pop();
          this.api.getSummary().subscribe(d => (this.summary = d));
        }
      })
    );
  }

  private processEvents500(d: any) {
    const events = d.events || [];
    const pageTimeEvents = events.filter((e: any) => e.eventType === 'page_time' && !e.metadata?.isHeartbeat);
    const routeTimeMap = new Map<string, { totalTime: number; visits: number; activities: number }>();
    pageTimeEvents.forEach((e: any) => {
      const route = e.metadata?.route || 'unknown';
      const existing = routeTimeMap.get(route) || { totalTime: 0, visits: 0, activities: 0 };
      existing.totalTime += e.metadata?.timeSpentSeconds || 0;
      existing.visits++;
      existing.activities += e.metadata?.activitiesOnPage || 0;
      routeTimeMap.set(route, existing);
    });

    this.sortedRoutes = [...routeTimeMap.entries()]
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, 15);
    this.hasPageTimeData = this.sortedRoutes.length > 0;

    const typeCounts = new Map<string, number>();
    events.forEach((e: any) => typeCounts.set(e.eventType, (typeCounts.get(e.eventType) || 0) + 1));
    this.typeEntries = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]);
    this.hasEventMixData = this.typeEntries.length > 0;
  }

  private buildPageTimeAndEventMixCharts() {
    this.pageTimeChart?.destroy();
    this.eventMixChart?.destroy();
    this.pageTimeChart = undefined;
    this.eventMixChart = undefined;

    const pt = this.pageTimeChartRef?.nativeElement;
    if (this.hasPageTimeData && pt) {
      this.pageTimeChart = new Chart(pt, {
        type: 'bar',
        data: {
          labels: this.sortedRoutes.map(([route]) => this.shortenRoute(route)),
          datasets: [
            {
              label: 'Total time (s)',
              data: this.sortedRoutes.map(([, v]) => v.totalTime),
              backgroundColor: palette.primary,
              ...barDatasetStyle
            },
            {
              label: 'Avg time / visit (s)',
              data: this.sortedRoutes.map(([, v]) => Math.round(v.totalTime / Math.max(v.visits, 1))),
              backgroundColor: palette.teal,
              ...barDatasetStyle
            }
          ]
        },
        options: horizontalBarOptions({
          plugins: {
            tooltip: {
              callbacks: {
                afterBody: (items: TooltipItem<'bar'>[]) => {
                  const i = items[0]?.dataIndex ?? 0;
                  const row = this.sortedRoutes[i];
                  if (!row) return [];
                  const v = row[1];
                  const avg = v.totalTime / Math.max(v.visits, 1);
                  return [
                    `Visits: ${v.visits.toLocaleString()}`,
                    `Clicks on page: ${v.activities.toLocaleString()}`,
                    `Avg time / visit: ${avg.toFixed(1)}s`
                  ];
                }
              }
            }
          }
        })
      });
    }

    const et = this.eventTypeChartRef?.nativeElement;
    if (this.hasEventMixData && et) {
      const labels = this.typeEntries.map(([t]) => t);
      const values = this.typeEntries.map(([, c]) => c);
      const colors = labels.map((_, idx) => palette.series[idx % palette.series.length]);
      this.eventMixChart = new Chart(et, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderWidth: 3,
              borderColor: '#ffffff',
              hoverOffset: 10
            }
          ]
        },
        options: doughnutOptions(labels, values)
      });
    }
  }

  private buildFeaturesChart() {
    this.featuresChart?.destroy();
    this.featuresChart = undefined;
    const el = this.featuresChartRef?.nativeElement;
    if (!this.hasFeaturesData || !el) return;

    const data = this.topFeaturesRows;
    const sum = data.reduce((s: number, row: any) => s + row.count, 0);
    this.featuresChart = new Chart(el, {
      type: 'bar',
      data: {
        labels: data.map((d: any) => this.shortenRoute(d.featureName)),
        datasets: [
          {
            label: 'Events',
            data: data.map((d: any) => d.count),
            backgroundColor: palette.secondary,
            ...barDatasetStyle
          }
        ]
      },
      options: horizontalBarOptions({
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item: TooltipItem<'bar'>) => {
                const n = Number(item.raw);
                const pct = sum > 0 ? ((n / sum) * 100).toFixed(1) : '0';
                return ` ${item.dataset.label}: ${n.toLocaleString()} (${pct}% of this top list)`;
              }
            }
          }
        }
      })
    });
  }

  shortenRoute(route: string): string {
    if (!route) return '';
    return route.replace(/^\/business-loans\//, '/').replace(/^\//, '');
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.pageTimeChart?.destroy();
    this.eventMixChart?.destroy();
    this.featuresChart?.destroy();
  }
}
