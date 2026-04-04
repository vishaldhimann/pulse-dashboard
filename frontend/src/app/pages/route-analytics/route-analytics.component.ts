import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface RouteStats {
  route: string;
  totalTime: number;
  visits: number;
  avgTime: number;
  uniqueUsers: number;
}

interface RouteTransition {
  from: string;
  to: string;
  count: number;
}

@Component({
  selector: 'pulse-route-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-header__title">Route <span class="gradient-text">Analytics</span></h1>
        <p class="page-header__desc">Analyze time spent per route, navigation patterns, and most visited pages.</p>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <span>Analyzing route data...</span>
      </div>

      <ng-container *ngIf="!loading">
        <!-- KPI Row -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--indigo">
              <span class="material-symbols-outlined">route</span>
            </div>
            <div class="kpi-card__label">Unique Routes</div>
            <div class="kpi-card__value">{{ routes.length }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--purple">
              <span class="material-symbols-outlined">swap_horiz</span>
            </div>
            <div class="kpi-card__label">Route Transitions</div>
            <div class="kpi-card__value">{{ transitions.length }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--green">
              <span class="material-symbols-outlined">timer</span>
            </div>
            <div class="kpi-card__label">Avg Time / Page</div>
            <div class="kpi-card__value">{{ formatDuration(avgTimePerPage) }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--pink">
              <span class="material-symbols-outlined">trending_up</span>
            </div>
            <div class="kpi-card__label">Most Visited</div>
            <div class="kpi-card__value" style="font-size:14px">{{ topRoute }}</div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
          <div class="chart-card">
            <div class="chart-card__header">
              <div class="chart-card__title">Time Per Route (Top 15)</div>
            </div>
            <div class="chart-card__body">
              <canvas #timePerRouteChart></canvas>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-card__header">
              <div class="chart-card__title">Visits Per Route (Top 15)</div>
            </div>
            <div class="chart-card__body">
              <canvas #visitsPerRouteChart></canvas>
            </div>
          </div>
        </div>

        <!-- Route Table -->
        <div class="glass-card" style="margin-bottom:24px">
          <div class="glass-card__header">
            <div>
              <div class="glass-card__title">All Routes</div>
              <div class="glass-card__subtitle">{{ routes.length }} routes tracked</div>
            </div>
          </div>
          <div class="glass-card__body" style="padding:0">
            <table class="data-table" *ngIf="routes.length">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Total Time</th>
                  <th>Visits</th>
                  <th>Avg Time</th>
                  <th>Unique Users</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of routes; let i = index" class="slide-in" [style.animation-delay]="(i*20)+'ms'">
                  <td class="mono" style="color:var(--text-primary)">{{ r.route }}</td>
                  <td style="font-weight:600;color:var(--accent);font-variant-numeric:tabular-nums">{{ formatDuration(r.totalTime) }}</td>
                  <td><span class="badge badge--info">{{ r.visits }}</span></td>
                  <td>{{ formatDuration(r.avgTime) }}</td>
                  <td>{{ r.uniqueUsers }}</td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="!routes.length" class="empty-state">No route data available.</div>
          </div>
        </div>

        <!-- Route Transitions -->
        <div class="glass-card">
          <div class="glass-card__header">
            <div>
              <div class="glass-card__title">Route Transitions</div>
              <div class="glass-card__subtitle">Navigation flow between pages</div>
            </div>
          </div>
          <div class="glass-card__body" style="padding:0">
            <table class="data-table" *ngIf="transitions.length">
              <thead>
                <tr>
                  <th>From</th>
                  <th></th>
                  <th>To</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of transitions; let i = index" class="slide-in" [style.animation-delay]="(i*20)+'ms'">
                  <td class="mono" style="color:var(--text-secondary)">{{ t.from }}</td>
                  <td style="text-align:center">
                    <span class="material-symbols-outlined" style="font-size:16px;color:var(--accent)">arrow_forward</span>
                  </td>
                  <td class="mono" style="color:var(--text-primary)">{{ t.to }}</td>
                  <td><span class="badge badge--accent">{{ t.count }}</span></td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="!transitions.length" class="empty-state">No route transitions recorded.</div>
          </div>
        </div>
      </ng-container>
    </div>
  `
})
export class RouteAnalyticsComponent implements OnInit, OnDestroy {
  @ViewChild('timePerRouteChart') timeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('visitsPerRouteChart') visitsChartRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  routes: RouteStats[] = [];
  transitions: RouteTransition[] = [];
  avgTimePerPage = 0;
  topRoute = '—';
  private charts: Chart[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  formatDuration(seconds: any): string {
    if (seconds == null || isNaN(seconds)) return '0s';
    const s = Math.round(seconds);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60);
    const rem = s % 60;
    if (m < 60) return m + 'm ' + rem + 's';
    const h = Math.floor(m / 60);
    return h + 'h ' + (m % 60) + 'm';
  }

  private loadData(): void {
    this.loading = true;
    this.api.getEvents({ limit: 5000 }).subscribe({
      next: (res) => {
        const events = res?.events || [];
        this.processRoutes(events);
        this.processTransitions(events);
        this.loading = false;
        setTimeout(() => this.buildCharts(), 100);
      },
      error: () => { this.loading = false; }
    });
  }

  private processRoutes(events: any[]): void {
    const routeMap = new Map<string, { totalTime: number; visits: number; users: Set<string> }>();

    for (const evt of events) {
      if (evt.eventType !== 'page_time' && evt.eventType !== 'pageview') continue;
      const route = evt.metadata?.route || '';
      if (!route) continue;

      if (!routeMap.has(route)) routeMap.set(route, { totalTime: 0, visits: 0, users: new Set() });
      const entry = routeMap.get(route)!;
      entry.totalTime += evt.metadata?.timeSpentSeconds || 0;
      entry.visits += 1;
      const userId = evt.metadata?._ctx?.userId || evt.hashedUserId || '';
      if (userId) entry.users.add(userId);
    }

    this.routes = Array.from(routeMap.entries())
      .map(([route, data]) => ({
        route,
        totalTime: data.totalTime,
        visits: data.visits,
        avgTime: data.visits > 0 ? data.totalTime / data.visits : 0,
        uniqueUsers: data.users.size
      }))
      .sort((a, b) => b.totalTime - a.totalTime);

    if (this.routes.length) {
      this.avgTimePerPage = this.routes.reduce((s, r) => s + r.avgTime, 0) / this.routes.length;
      const mostVisited = [...this.routes].sort((a, b) => b.visits - a.visits);
      this.topRoute = mostVisited[0]?.route || '—';
    }
  }

  private processTransitions(events: any[]): void {
    const transMap = new Map<string, number>();

    for (const evt of events) {
      if (evt.eventType !== 'route_change') continue;
      const from = evt.metadata?.fromRoute || '';
      const to = evt.metadata?.toRoute || '';
      if (!from || !to) continue;
      const key = `${from}|||${to}`;
      transMap.set(key, (transMap.get(key) || 0) + 1);
    }

    this.transitions = Array.from(transMap.entries())
      .map(([key, count]) => {
        const [from, to] = key.split('|||');
        return { from, to, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }

  private buildCharts(): void {
    this.buildTimeChart();
    this.buildVisitsChart();
  }

  private buildTimeChart(): void {
    if (!this.timeChartRef?.nativeElement || !this.routes.length) return;
    const top = this.routes.slice(0, 15);
    const fullLabels = top.map(r => r.route);
    const chart = new Chart(this.timeChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: top.map(r => { const s = r.route.replace(/^\/business-loans\//, '/'); return s.length > 20 ? '...' + s.slice(-17) : s; }),
        datasets: [{
          label: 'Total Time (s)',
          data: top.map(r => Math.round(r.totalTime)),
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          borderColor: '#818cf8',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { grid: { color: '#f3f4f6' }, ticks: { color: '#111827', font: { family: 'Inter', size: 13 } } },
          y: { grid: { display: false }, ticks: { color: '#111827', font: { family: 'Inter', size: 13 } } }
        },
        plugins: { legend: { display: false },
          tooltip: { callbacks: { title: (items: any) => { const i = items[0]?.dataIndex; return i != null ? fullLabels[i] : ''; } } } }
      }
    });
    (chart as any).__fullLabels = fullLabels;
    this.charts.push(chart);
  }

  private buildVisitsChart(): void {
    if (!this.visitsChartRef?.nativeElement || !this.routes.length) return;
    const sorted = [...this.routes].sort((a, b) => b.visits - a.visits).slice(0, 15);
    const fullLabels = sorted.map(r => r.route);
    const colors = ['#6366f1', '#7c3aed', '#8b5cf6', '#a855f7', '#c084fc', '#d946ef', '#ec4899', '#f472b6',
      '#818cf8', '#a78bfa', '#c4b5fd', '#ddd6fe', '#60a5fa', '#93c5fd', '#34d399'];

    const chart = new Chart(this.visitsChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map(r => { const s = r.route.replace(/^\/business-loans\//, '/'); return s.length > 20 ? '...' + s.slice(-17) : s; }),
        datasets: [{
          label: 'Visits',
          data: sorted.map(r => r.visits),
          backgroundColor: colors.slice(0, sorted.length),
          borderWidth: 0,
          borderRadius: 6,
          barPercentage: 0.7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { grid: { color: '#f3f4f6' }, ticks: { color: '#111827', font: { family: 'Inter', size: 13 } } },
          y: { grid: { display: false }, ticks: { color: '#111827', font: { family: 'Inter', size: 13 } } }
        },
        plugins: { legend: { display: false },
          tooltip: { callbacks: { title: (items: any) => { const i = items[0]?.dataIndex; return i != null ? fullLabels[i] : ''; } } } }
      }
    });
    (chart as any).__fullLabels = fullLabels;
    this.charts.push(chart);
  }
}


