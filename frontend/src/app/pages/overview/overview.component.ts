import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Chart, registerables } from 'chart.js';
import * as Highcharts from 'highcharts';

Chart.register(...registerables);

@Component({
  selector: 'pulse-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-header__title">Overview</h1>
        <p class="page-header__desc">High-level metrics across all tracked applications and users.</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--indigo"><span class="material-symbols-outlined">group</span></div>
          <div class="kpi-card__label">Total Users</div>
          <div class="kpi-card__value">{{ summary?.totalUsers ?? '—' }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--purple"><span class="material-symbols-outlined">bolt</span></div>
          <div class="kpi-card__label">Total Events</div>
          <div class="kpi-card__value">{{ formatNum(summary?.totalEvents) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--green"><span class="material-symbols-outlined">today</span></div>
          <div class="kpi-card__label">Events Today</div>
          <div class="kpi-card__value">{{ formatNum(summary?.todayEvents) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--red"><span class="material-symbols-outlined">error</span></div>
          <div class="kpi-card__label">Errors Today</div>
          <div class="kpi-card__value" style="color:var(--error)">{{ summary?.errorsToday ?? '—' }}</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-card__header"><div class="chart-card__title">Event Type Breakdown</div></div>
          <div class="chart-card__body"><canvas #eventTypeChart></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card__header"><div class="chart-card__title">Top Pages by Time Spent</div></div>
          <div class="chart-card__body"><canvas #pageTimeChart></canvas></div>
        </div>
      </div>
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-card__header"><div class="chart-card__title">Daily Active Users</div></div>
          <div class="chart-card__body"><div #dauChart class="overview-dau-chart"></div></div>
        </div>
        <div class="chart-card">
          <div class="chart-card__header"><div class="chart-card__title">Top Features</div></div>
          <div class="chart-card__body"><canvas #featuresChart></canvas></div>
        </div>
      </div>
    </div>
  `
})
export class OverviewComponent implements OnInit, OnDestroy {
  @ViewChild('eventTypeChart') eventTypeRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pageTimeChart') pageTimeRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dauChart') dauRef!: ElementRef<HTMLDivElement>;
  @ViewChild('featuresChart') featuresRef!: ElementRef<HTMLCanvasElement>;

  summary: any = null;
  private charts: Chart[] = [];
  private dauHighchart?: ReturnType<typeof Highcharts.chart>;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getSummary().subscribe({ next: d => { this.summary = d; }, error: () => {} });

    // Event type breakdown — separate endpoint
    this.api.getEventTypeBreakdown(30).subscribe({
      next: (data) => setTimeout(() => {
        if (!this.eventTypeRef?.nativeElement || !data) return;
        const labels = Object.keys(data);
        const values = Object.values(data) as number[];
        if (!labels.length) return;
        const colors = ['#4f46e5','#7c3aed','#db2777','#059669','#2563eb','#d97706','#dc2626','#0891b2'];
        this.charts.push(new Chart(this.eventTypeRef.nativeElement, {
          type: 'doughnut',
          data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0, hoverOffset: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, cutout: '62%',
            plugins: { legend: { position: 'right', labels: { color: '#111827', font: { family: 'Inter', size: 13 }, padding: 10, usePointStyle: true, pointStyleWidth: 8 } } } }
        }));
      }, 100),
      error: () => {}
    });

    // Page time summary
    this.api.getPageTimeSummary().subscribe({
      next: (data) => setTimeout(() => {
        if (!this.pageTimeRef?.nativeElement) return;
        const items = Array.isArray(data) ? data : [];
        const sorted = items.sort((a: any, b: any) => (b.totalTimeSeconds || 0) - (a.totalTimeSeconds || 0)).slice(0, 10);
        if (!sorted.length) return;
        this.charts.push(new Chart(this.pageTimeRef.nativeElement, {
          type: 'bar',
          data: {
            labels: sorted.map((p: any) => { const r = p.route || ''; return r.length > 28 ? '...' + r.slice(-25) : r; }),
            datasets: [{ label: 'Time (s)', data: sorted.map((p: any) => Math.round(p.totalTimeSeconds || 0)),
              backgroundColor: 'rgba(79,70,229,0.15)', borderColor: '#4f46e5', borderWidth: 1, borderRadius: 4, barPercentage: 0.7 }]
          },
          options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y',
            scales: { x: { grid: { color: '#f3f4f6' }, ticks: { color: '#111827', font: { family: 'Inter', size: 13 } } },
                      y: { grid: { display: false }, ticks: { color: '#111827', font: { family: 'Inter', size: 13 } } } },
            plugins: { legend: { display: false } } }
        }));
      }, 150),
      error: () => {}
    });

    // DAU — Highcharts column with narrow bars (strip style); response is { date, dau, totalEvents }[]
    this.api.getDau(30).subscribe({
      next: (data) => setTimeout(() => {
        if (!this.dauRef?.nativeElement) return;
        const items = Array.isArray(data) ? data : [];
        if (!items.length) return;
        this.dauHighchart?.destroy();
        const categories = items.map((d: any) => String(d.date || ''));
        const values = items.map((d: any) => Number(d.dau) || 0);
        const labelStep = Math.max(1, Math.ceil(categories.length / 10));
        this.dauHighchart = Highcharts.chart(this.dauRef.nativeElement, {
          chart: { type: 'column', backgroundColor: 'transparent', height: 320, style: { fontFamily: 'Inter, system-ui, sans-serif' } },
          title: { text: undefined },
          credits: { enabled: false },
          xAxis: {
            categories,
            lineColor: '#e5e7eb',
            tickLength: 0,
            labels: { style: { color: '#111827', fontSize: '10px' }, step: labelStep }
          },
          yAxis: {
            min: 0,
            title: { text: undefined },
            gridLineColor: '#f3f4f6',
            labels: { style: { color: '#111827', fontSize: '10px' } }
          },
          legend: { enabled: false },
          tooltip: {
            shared: true,
            backgroundColor: 'rgba(255,255,255,0.96)',
            borderColor: '#e5e7eb',
            style: { color: '#374151', fontSize: '12px' }
          },
          plotOptions: {
            column: {
              borderWidth: 0,
              borderRadius: 2,
              pointWidth: 14,
              groupPadding: 0.06,
              pointPadding: 0.04,
              color: 'rgba(79,70,229,0.88)'
            }
          },
          series: [{ type: 'column', name: 'DAU', data: values }]
        });
      }, 200),
      error: () => {}
    });

    // Top features
    this.api.getTopFeatures(30).subscribe({
      next: (data) => setTimeout(() => {
        if (!this.featuresRef?.nativeElement) return;
        const items = Array.isArray(data) ? data : [];
        const top = items.slice(0, 8);
        if (!top.length) return;
        const palette = ['#4f46e5','#7c3aed','#db2777','#059669','#2563eb','#d97706','#0891b2','#be185d'];
        this.charts.push(new Chart(this.featuresRef.nativeElement, {
          type: 'bar',
          data: {
            labels: top.map((f: any) => f.featureName || ''),
            datasets: [{ label: 'Events', data: top.map((f: any) => f.count || 0),
              backgroundColor: palette.slice(0, top.length), borderWidth: 0, borderRadius: 4, barPercentage: 0.65 }]
          },
          options: { responsive: true, maintainAspectRatio: false,
            scales: { x: { grid: { display: false }, ticks: { color: '#111827', font: { family: 'Inter', size: 13 }, maxRotation: 45 } },
                      y: { grid: { color: '#f3f4f6' }, ticks: { color: '#111827', font: { family: 'Inter', size: 13 } }, beginAtZero: true } },
            plugins: { legend: { display: false } } }
        }));
      }, 250),
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
    this.dauHighchart?.destroy();
  }

  formatNum(n: any): string {
    if (n == null) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }
}

