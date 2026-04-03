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
import { ReportingContextService } from '../../services/reporting-context.service';
import { forkJoin, finalize, distinctUntilChanged, switchMap, tap } from 'rxjs';
import Chart from 'chart.js/auto';
import {
  barDatasetStyle,
  doughnutOptions,
  funnelBarOptions,
  pieOptions,
  palette,
  verticalBarOptions
} from '../../chart-defaults';
import {
  AnalyticsPageComponent,
  ChartSkeletonComponent,
  ReportCardComponent,
  ReportGridComponent,
  SkeletonTableComponent
} from '../../ui';

@Component({
  selector: 'pulse-business-intel',
  standalone: true,
  imports: [
    CommonModule,
    AnalyticsPageComponent,
    ReportCardComponent,
    ReportGridComponent,
    ChartSkeletonComponent,
    SkeletonTableComponent
  ],
  template: `
    <pulse-analytics-page
      title="Business intelligence"
      description="Funnel efficiency, demand by principal, credit spread, and offer outcomes—with downstream dependency health similar to GA’s tech diagnostics panels."
    >
      <ng-container *ngIf="!chartsLoading">
        <pulse-report-grid>
          <pulse-report-card
            kicker="Funnel"
            title="Application funnel"
            subtitle="Volume by stage. Tooltips include retention from the top of funnel and step-to-step conversion / drop-off."
          >
            <div class="chart-host" *ngIf="hasFunnelData">
              <canvas #funnelChart></canvas>
            </div>
            <div *ngIf="!hasFunnelData" class="chart-empty">
              <span class="material-symbols-outlined">filter_alt</span>
              <span>No funnel data in this range.</span>
            </div>
          </pulse-report-card>
          <pulse-report-card
            title="Loan demand by principal"
            subtitle="Application counts by requested amount bucket. Identify concentration risk in your loan sizes."
          >
            <div class="chart-host" *ngIf="hasDemandData">
              <canvas #demandChart></canvas>
            </div>
            <div *ngIf="!hasDemandData" class="chart-empty">
              <span class="material-symbols-outlined">payments</span>
              <span>No demand buckets yet.</span>
            </div>
          </pulse-report-card>
          <pulse-report-card
            title="Credit score spread"
            subtitle="Distribution of modeled credit bands in the selected window."
          >
            <div class="chart-host" *ngIf="hasCreditData">
              <canvas #creditChart></canvas>
            </div>
            <div *ngIf="!hasCreditData" class="chart-empty">
              <span class="material-symbols-outlined">credit_score</span>
              <span>No credit distribution yet.</span>
            </div>
          </pulse-report-card>
          <pulse-report-card
            title="Offer outcomes"
            subtitle="Shares of acceptance states—spot post-underwriting friction from the breakdown."
          >
            <div class="chart-host" *ngIf="hasOfferData">
              <canvas #offerChart></canvas>
            </div>
            <div *ngIf="!hasOfferData" class="chart-empty">
              <span class="material-symbols-outlined">task_alt</span>
              <span>No offer outcomes yet.</span>
            </div>
          </pulse-report-card>
        </pulse-report-grid>
      </ng-container>

      <ng-container *ngIf="chartsLoading">
        <div class="report-grid report-grid--loading report-grid--single">
          <pulse-chart-skeleton></pulse-chart-skeleton>
          <pulse-chart-skeleton></pulse-chart-skeleton>
          <pulse-chart-skeleton></pulse-chart-skeleton>
          <pulse-chart-skeleton></pulse-chart-skeleton>
        </div>
      </ng-container>

      <pulse-report-card
        title="Downstream service health"
        subtitle="Average latency, error rate, and volume for integrated services (24h)."
      >
        <pulse-skeleton-table *ngIf="serviceHealthLoading" [cols]="5" [rows]="5"></pulse-skeleton-table>
        <table class="data-table" *ngIf="!serviceHealthLoading && serviceHealth.length">
          <thead>
            <tr><th>Service</th><th>Avg RT</th><th>Error %</th><th>Calls</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of serviceHealth">
              <td>{{ s.service }}</td>
              <td>{{ s.avgResponseTime }}ms</td>
              <td [class.error-text]="s.errorRate > 5">{{ s.errorRate }}%</td>
              <td>{{ s.totalCalls }}</td>
              <td>
                <span
                  class="status-chip"
                  [class.status-chip--ok]="s.errorRate <= 5"
                  [class.status-chip--warn]="s.errorRate > 5 && s.errorRate <= 10"
                  [class.status-chip--bad]="s.errorRate > 10"
                >
                  <span class="material-symbols-outlined" aria-hidden="true">{{
                    s.errorRate > 10 ? 'error' : s.errorRate > 5 ? 'warning' : 'check_circle'
                  }}</span>
                  {{ s.errorRate > 10 ? 'Critical' : s.errorRate > 5 ? 'Watch' : 'Healthy' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="!serviceHealthLoading && !serviceHealth.length" class="chart-empty">
          <span class="material-symbols-outlined">cloud_off</span>
          <span>No service health rows for this window.</span>
        </div>
      </pulse-report-card>
    </pulse-analytics-page>
  `
})
export class BusinessIntelComponent implements OnInit, OnDestroy {
  @ViewChild('funnelChart') funnelRef: ElementRef;
  @ViewChild('demandChart') demandRef: ElementRef;
  @ViewChild('creditChart') creditRef: ElementRef;
  @ViewChild('offerChart') offerRef: ElementRef;

  serviceHealth: any[] = [];
  serviceHealthLoading = true;
  chartsLoading = true;

  hasFunnelData = false;
  hasDemandData = false;
  hasCreditData = false;
  hasOfferData = false;

  private funnelRows: any[] = [];
  private demandRows: any[] = [];
  private creditRows: any[] = [];
  private offerRows: any[] = [];

  private funnelChart?: Chart;
  private demandChart?: Chart;
  private creditChart?: Chart;
  private offerChart?: Chart;

  private readonly reporting = inject(ReportingContextService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {
    toObservable(this.reporting.days)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        distinctUntilChanged(),
        tap(() => {
          this.chartsLoading = true;
          this.cdr.markForCheck();
        }),
        switchMap(days =>
          forkJoin({
            funnel: this.api.getApplicationFunnel(days),
            demand: this.api.getLoanDemand(days),
            credit: this.api.getCreditDistribution(days),
            offer: this.api.getOfferAcceptance(days)
          }).pipe(
            finalize(() => {
              this.chartsLoading = false;
              this.cdr.detectChanges();
              queueMicrotask(() => this.renderCharts());
            })
          )
        )
      )
      .subscribe({
        next: res => {
          this.funnelRows = res.funnel || [];
          this.demandRows = res.demand || [];
          this.creditRows = res.credit || [];
          this.offerRows = res.offer || [];
          this.hasFunnelData = this.funnelRows.length > 0;
          this.hasDemandData = this.demandRows.length > 0;
          this.hasCreditData = this.creditRows.length > 0;
          this.hasOfferData = this.offerRows.length > 0;
        }
      });
  }

  ngOnInit() {
    this.api
      .getServiceHealth(24)
      .pipe(
        finalize(() => {
          this.serviceHealthLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(d => (this.serviceHealth = d));
  }

  private renderCharts() {
    this.funnelChart?.destroy();
    this.demandChart?.destroy();
    this.creditChart?.destroy();
    this.offerChart?.destroy();

    const fe = this.funnelRef?.nativeElement;
    if (this.hasFunnelData && fe) {
      const data = this.funnelRows;
      const counts = data.map((d: any) => d.count);
      this.funnelChart = new Chart(fe, {
        type: 'bar',
        data: {
          labels: data.map((d: any) => d.label),
          datasets: [
            {
              label: 'Applications',
              data: counts,
              backgroundColor: data.map((_: any, i: number) => {
                const t = data.length <= 1 ? 0 : i / (data.length - 1);
                const alpha = 0.92 - t * 0.5;
                return `rgba(15, 118, 110, ${alpha})`;
              }),
              ...barDatasetStyle
            }
          ]
        },
        options: funnelBarOptions(counts)
      });
    }

    const de = this.demandRef?.nativeElement;
    if (this.hasDemandData && de) {
      const data = this.demandRows;
      const labels = data.map((d: any) => `$${(d._id / 1000)}K`);
      const values = data.map((d: any) => d.count);
      const total = values.reduce((s: number, n: number) => s + n, 0);
      this.demandChart = new Chart(de, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Applications',
              data: values,
              backgroundColor: palette.amber,
              ...barDatasetStyle
            }
          ]
        },
        options: verticalBarOptions({
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                footer: items => {
                  const v = Number(items[0]?.raw);
                  const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                  return `${pct}% of applications in this window`;
                }
              }
            }
          }
        })
      });
    }

    const ce = this.creditRef?.nativeElement;
    if (this.hasCreditData && ce) {
      const data = this.creditRows;
      const labels = data.map((d: any) => `Band ${d._id}`);
      const values = data.map((d: any) => d.count);
      this.creditChart = new Chart(ce, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: labels.map((_, i) => palette.series[i % palette.series.length]),
              borderWidth: 3,
              borderColor: '#ffffff',
              hoverOffset: 10
            }
          ]
        },
        options: doughnutOptions(labels, values)
      });
    }

    const oe = this.offerRef?.nativeElement;
    if (this.hasOfferData && oe) {
      const data = this.offerRows;
      const labels = data.map((d: any) => d.status);
      const values = data.map((d: any) => d.count);
      this.offerChart = new Chart(oe, {
        type: 'pie',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: labels.map((_, i) => palette.series[i % palette.series.length]),
              borderWidth: 3,
              borderColor: '#ffffff'
            }
          ]
        },
        options: pieOptions(labels, values)
      });
    }
  }

  ngOnDestroy() {
    this.funnelChart?.destroy();
    this.demandChart?.destroy();
    this.creditChart?.destroy();
    this.offerChart?.destroy();
  }
}
