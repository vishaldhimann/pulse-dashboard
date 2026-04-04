import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface ErrorGroup {
  message: string;
  count: number;
  lastSeen: Date;
  pages: string[];
  instances: string[];
}

@Component({
  selector: 'pulse-errors',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-header__title">Error <span class="gradient-text">Monitoring</span></h1>
        <p class="page-header__desc">Track errors across all applications, grouped by message with timeline analysis.</p>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading error data...</span>
      </div>

      <ng-container *ngIf="!loading">
        <!-- KPI -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--red">
              <span class="material-symbols-outlined">error</span>
            </div>
            <div class="kpi-card__label">Total Errors (24h)</div>
            <div class="kpi-card__value" style="color:var(--error)">{{ totalErrors }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--amber">
              <span class="material-symbols-outlined">category</span>
            </div>
            <div class="kpi-card__label">Error Groups</div>
            <div class="kpi-card__value">{{ errorGroups.length }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--purple">
              <span class="material-symbols-outlined">web</span>
            </div>
            <div class="kpi-card__label">Affected Pages</div>
            <div class="kpi-card__value">{{ affectedPages }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--blue">
              <span class="material-symbols-outlined">schedule</span>
            </div>
            <div class="kpi-card__label">Last Error</div>
            <div class="kpi-card__value" style="font-size:14px">{{ lastErrorTime }}</div>
          </div>
        </div>

        <!-- Timeline Chart -->
        <div class="chart-card" style="margin-bottom:24px">
          <div class="chart-card__header">
            <div class="chart-card__title">Error Timeline (24h)</div>
          </div>
          <div class="chart-card__body">
            <canvas #timelineChart></canvas>
          </div>
        </div>

        <div class="charts-grid">
          <!-- Errors by Page -->
          <div class="chart-card">
            <div class="chart-card__header">
              <div class="chart-card__title">Errors by Page</div>
            </div>
            <div class="chart-card__body">
              <canvas #errorsByPageChart></canvas>
            </div>
          </div>

          <!-- Error Type Distribution -->
          <div class="chart-card">
            <div class="chart-card__header">
              <div class="chart-card__title">Error Distribution</div>
            </div>
            <div class="chart-card__body">
              <canvas #errorDistChart></canvas>
            </div>
          </div>
        </div>

        <!-- Error Groups Table -->
        <div class="glass-card" style="margin-top:24px">
          <div class="glass-card__header">
            <div>
              <div class="glass-card__title">Error Groups</div>
              <div class="glass-card__subtitle">Errors grouped by message</div>
            </div>
            <span class="badge badge--error" *ngIf="totalErrors">{{ totalErrors }} total</span>
          </div>
          <div class="glass-card__body" style="padding:0">
            <div *ngIf="!errorGroups.length" class="empty-state">
              <span class="material-symbols-outlined" style="font-size:40px;margin-bottom:12px;color:var(--success)">check_circle</span>
              <span>No errors in the last 24 hours</span>
            </div>
            <div *ngFor="let g of errorGroups; let i = index" class="error-group-row slide-in" [style.animation-delay]="(i*30)+'ms'">
              <div class="error-group-row__header">
                <div class="error-group-row__icon">
                  <span class="material-symbols-outlined" style="color:var(--error);font-size:18px">error</span>
                </div>
                <div class="error-group-row__content">
                  <div class="error-group-row__message">{{ g.message }}</div>
                  <div class="error-group-row__meta">
                    <span>Last seen: {{ g.lastSeen | date:'MMM d, HH:mm' }}</span>
                    <span *ngIf="g.pages.length">· Pages: {{ g.pages.slice(0, 3).join(', ') }}</span>
                  </div>
                </div>
                <div class="error-group-row__count">
                  <span class="badge badge--error">{{ g.count }}×</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .error-group-row {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      transition: background 0.15s ease;
    }
    .error-group-row:hover { background: var(--bg-hover); }
    .error-group-row:last-child { border-bottom: none; }
    .error-group-row__header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .error-group-row__icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--error-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .error-group-row__content { flex: 1; min-width: 0; }
    .error-group-row__message {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-primary);
      word-break: break-all;
      line-height: 1.5;
    }
    .error-group-row__meta {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .error-group-row__count { flex-shrink: 0; }
  `]
})
export class ErrorsComponent implements OnInit, OnDestroy {
  @ViewChild('timelineChart') timelineRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('errorsByPageChart') errorsByPageRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('errorDistChart') errorDistRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  totalErrors = 0;
  affectedPages = 0;
  lastErrorTime = '—';
  errorGroups: ErrorGroup[] = [];
  private charts: Chart[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  private loadData(): void {
    this.loading = true;

    this.api.getErrors(24).subscribe({
      next: (data) => {
        const errors = Array.isArray(data) ? data : (data?.errors || []);
        this.processErrors(errors);
        this.loading = false;
        setTimeout(() => this.buildCharts(errors), 100);
      },
      error: () => {
        // Fallback: try loading error events directly
        this.api.getEventsByType('error', 500).subscribe({
          next: (res) => {
            const events = res?.events || [];
            this.processErrorEvents(events);
            this.loading = false;
            setTimeout(() => this.buildChartsFromEvents(events), 100);
          },
          error: () => { this.loading = false; }
        });
      }
    });
  }

  private processErrors(errors: any[]): void {
    this.totalErrors = errors.length;
    const pageSet = new Set<string>();
    const groupMap = new Map<string, { count: number; lastSeen: Date; pages: Set<string>; instances: Set<string> }>();

    for (const err of errors) {
      const msg = err.errorMessage || err.message || err.metadata?.errorMessage || 'Unknown error';
      const page = err.route || err.page || err.metadata?.route || '';
      if (page) pageSet.add(page);

      if (!groupMap.has(msg)) {
        groupMap.set(msg, { count: 0, lastSeen: new Date(0), pages: new Set(), instances: new Set() });
      }
      const g = groupMap.get(msg)!;
      g.count++;
      const ts = new Date(err.timestamp || err.createdAt || Date.now());
      if (ts > g.lastSeen) g.lastSeen = ts;
      if (page) g.pages.add(page);
      if (err.instanceId) g.instances.add(err.instanceId);
    }

    this.affectedPages = pageSet.size;
    this.errorGroups = Array.from(groupMap.entries())
      .map(([message, data]) => ({
        message,
        count: data.count,
        lastSeen: data.lastSeen,
        pages: Array.from(data.pages),
        instances: Array.from(data.instances)
      }))
      .sort((a, b) => b.count - a.count);

    if (this.errorGroups.length) {
      const latest = this.errorGroups.reduce((a, b) => a.lastSeen > b.lastSeen ? a : b);
      this.lastErrorTime = latest.lastSeen.toLocaleTimeString();
    }
  }

  private processErrorEvents(events: any[]): void {
    this.totalErrors = events.length;
    const pageSet = new Set<string>();
    const groupMap = new Map<string, { count: number; lastSeen: Date; pages: Set<string>; instances: Set<string> }>();

    for (const evt of events) {
      const msg = evt.metadata?.errorMessage || evt.metadata?.message || 'Unknown error';
      const page = evt.metadata?.route || '';
      if (page) pageSet.add(page);

      if (!groupMap.has(msg)) {
        groupMap.set(msg, { count: 0, lastSeen: new Date(0), pages: new Set(), instances: new Set() });
      }
      const g = groupMap.get(msg)!;
      g.count++;
      const ts = new Date(evt.timestamp);
      if (ts > g.lastSeen) g.lastSeen = ts;
      if (page) g.pages.add(page);
      if (evt.instanceId) g.instances.add(evt.instanceId);
    }

    this.affectedPages = pageSet.size;
    this.errorGroups = Array.from(groupMap.entries())
      .map(([message, data]) => ({
        message,
        count: data.count,
        lastSeen: data.lastSeen,
        pages: Array.from(data.pages),
        instances: Array.from(data.instances)
      }))
      .sort((a, b) => b.count - a.count);

    if (this.errorGroups.length) {
      const latest = this.errorGroups.reduce((a, b) => a.lastSeen > b.lastSeen ? a : b);
      this.lastErrorTime = latest.lastSeen.toLocaleTimeString();
    }
  }

  private buildCharts(errors: any[]): void {
    this.buildTimeline(errors);
    this.buildErrorsByPage(errors);
    this.buildErrorDist();
  }

  private buildChartsFromEvents(events: any[]): void {
    this.buildTimelineFromEvents(events);
    this.buildErrorsByPageFromEvents(events);
    this.buildErrorDist();
  }

  private buildTimeline(errors: any[]): void {
    if (!this.timelineRef?.nativeElement || !errors.length) return;

    const hourBuckets = new Map<string, number>();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600000);
      const key = d.getHours().toString().padStart(2, '0') + ':00';
      hourBuckets.set(key, 0);
    }

    for (const err of errors) {
      const ts = new Date(err.timestamp || err.createdAt || Date.now());
      const key = ts.getHours().toString().padStart(2, '0') + ':00';
      if (hourBuckets.has(key)) hourBuckets.set(key, (hourBuckets.get(key) || 0) + 1);
    }

    const labels = Array.from(hourBuckets.keys());
    const values = Array.from(hourBuckets.values());

    const chart = new Chart(this.timelineRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Errors',
          data: values,
          borderColor: '#f87171',
          backgroundColor: 'rgba(248, 113, 113, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#f87171',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 10 } }, beginAtZero: true }
        },
        plugins: { legend: { display: false } }
      }
    });
    this.charts.push(chart);
  }

  private buildTimelineFromEvents(events: any[]): void {
    if (!this.timelineRef?.nativeElement || !events.length) return;

    const hourBuckets = new Map<string, number>();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(Date.now() - i * 3600000);
      const key = d.getHours().toString().padStart(2, '0') + ':00';
      hourBuckets.set(key, 0);
    }

    for (const evt of events) {
      const ts = new Date(evt.timestamp);
      const key = ts.getHours().toString().padStart(2, '0') + ':00';
      if (hourBuckets.has(key)) hourBuckets.set(key, (hourBuckets.get(key) || 0) + 1);
    }

    const labels = Array.from(hourBuckets.keys());
    const values = Array.from(hourBuckets.values());

    const chart = new Chart(this.timelineRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Errors',
          data: values,
          borderColor: '#f87171',
          backgroundColor: 'rgba(248, 113, 113, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#f87171',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 10 } }, beginAtZero: true }
        },
        plugins: { legend: { display: false } }
      }
    });
    this.charts.push(chart);
  }

  private buildErrorsByPage(errors: any[]): void {
    if (!this.errorsByPageRef?.nativeElement) return;
    const pageMap = new Map<string, number>();
    for (const err of errors) {
      const page = err.route || err.page || err.metadata?.route || 'unknown';
      pageMap.set(page, (pageMap.get(page) || 0) + 1);
    }
    const sorted = Array.from(pageMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!sorted.length) return;

    const chart = new Chart(this.errorsByPageRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map(([p]) => p.length > 30 ? '...' + p.slice(-27) : p),
        datasets: [{
          label: 'Errors',
          data: sorted.map(([, c]) => c),
          backgroundColor: 'rgba(248, 113, 113, 0.5)',
          borderColor: '#f87171',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.45,
          categoryPercentage: 0.72,
          maxBarThickness: 14
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 10 } } },
          y: { grid: { display: false }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 10 } } }
        },
        plugins: { legend: { display: false } }
      }
    });
    this.charts.push(chart);
  }

  private buildErrorsByPageFromEvents(events: any[]): void {
    if (!this.errorsByPageRef?.nativeElement) return;
    const pageMap = new Map<string, number>();
    for (const evt of events) {
      const page = evt.metadata?.route || 'unknown';
      pageMap.set(page, (pageMap.get(page) || 0) + 1);
    }
    const sorted = Array.from(pageMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!sorted.length) return;

    const chart = new Chart(this.errorsByPageRef.nativeElement, {
      type: 'bar',
      data: {
        labels: sorted.map(([p]) => p.length > 30 ? '...' + p.slice(-27) : p),
        datasets: [{
          label: 'Errors',
          data: sorted.map(([, c]) => c),
          backgroundColor: 'rgba(248, 113, 113, 0.5)',
          borderColor: '#f87171',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.45,
          categoryPercentage: 0.72,
          maxBarThickness: 14
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 10 } } },
          y: { grid: { display: false }, ticks: { color: '#8b8ba3', font: { family: 'Inter', size: 10 } } }
        },
        plugins: { legend: { display: false } }
      }
    });
    this.charts.push(chart);
  }

  private buildErrorDist(): void {
    if (!this.errorDistRef?.nativeElement || !this.errorGroups.length) return;
    const top = this.errorGroups.slice(0, 8);
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a78bfa', '#818cf8', '#60a5fa', '#34d399', '#f472b6'];

    const chart = new Chart(this.errorDistRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: top.map(g => g.message.length > 40 ? g.message.slice(0, 37) + '...' : g.message),
        datasets: [{
          data: top.map(g => g.count),
          backgroundColor: colors.slice(0, top.length),
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { color: '#8b8ba3', font: { family: 'Inter', size: 10 }, padding: 10, usePointStyle: true, pointStyleWidth: 8 } }
        }
      }
    });
    this.charts.push(chart);
  }
}
