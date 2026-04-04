import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import { Subscription } from 'rxjs';

interface FeedEvent {
  id: string;
  eventType: string;
  timestamp: Date;
  route: string;
  userId: string;
  detail: string;
  instanceId: string;
}

@Component({
  selector: 'pulse-realtime',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:16px">
          <h1 class="page-header__title">Real-time <span class="gradient-text">Feed</span></h1>
          <div class="live-indicator pulse-live" *ngIf="connected">
            <span class="live-dot"></span>
            <span>LIVE</span>
          </div>
          <div class="live-indicator disconnected" *ngIf="!connected">
            <span>DISCONNECTED</span>
          </div>
        </div>
        <p class="page-header__desc">Live event stream via Socket.io. Events appear as they happen.</p>
      </div>

      <!-- Stats Bar -->
      <div class="kpi-grid" style="margin-bottom:24px">
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--indigo">
            <span class="material-symbols-outlined">stream</span>
          </div>
          <div class="kpi-card__label">Events in Feed</div>
          <div class="kpi-card__value">{{ events.length }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--green">
            <span class="material-symbols-outlined">bolt</span>
          </div>
          <div class="kpi-card__label">Events / min</div>
          <div class="kpi-card__value">{{ eventsPerMinute }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--red">
            <span class="material-symbols-outlined">error</span>
          </div>
          <div class="kpi-card__label">Errors in Feed</div>
          <div class="kpi-card__value" style="color:var(--error)">{{ errorCount }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--purple">
            <span class="material-symbols-outlined">filter_list</span>
          </div>
          <div class="kpi-card__label">Event Types</div>
          <div class="kpi-card__value">{{ uniqueTypes }}</div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <button class="filter-btn" [class.filter-btn--active]="activeFilter === 'all'" (click)="setFilter('all')">All</button>
        <button class="filter-btn" [class.filter-btn--active]="activeFilter === 'pageview'" (click)="setFilter('pageview')">Pageviews</button>
        <button class="filter-btn" [class.filter-btn--active]="activeFilter === 'interaction'" (click)="setFilter('interaction')">Interactions</button>
        <button class="filter-btn" [class.filter-btn--active]="activeFilter === 'api_call'" (click)="setFilter('api_call')">API Calls</button>
        <button class="filter-btn" [class.filter-btn--active]="activeFilter === 'error'" (click)="setFilter('error')">Errors</button>
        <button class="filter-btn" [class.filter-btn--active]="activeFilter === 'page_time'" (click)="setFilter('page_time')">Page Time</button>
        <button class="filter-btn" [class.filter-btn--active]="activeFilter === 'route_change'" (click)="setFilter('route_change')">Route Changes</button>
      </div>

      <!-- Event Feed -->
      <div class="glass-card">
        <div class="glass-card__header">
          <div>
            <div class="glass-card__title">Event Stream</div>
            <div class="glass-card__subtitle">{{ filteredEvents.length }} events · Max 200 in buffer</div>
          </div>
          <button class="btn" (click)="clearFeed()">
            <span class="material-symbols-outlined" style="font-size:16px">delete_sweep</span>
            Clear
          </button>
        </div>
        <div class="glass-card__body" style="padding:0;max-height:600px;overflow-y:auto">
          <div *ngIf="!filteredEvents.length" class="empty-state">
            <span class="material-symbols-outlined" style="font-size:40px;margin-bottom:12px;color:var(--text-muted)">stream</span>
            <span>Waiting for events...</span>
          </div>
          <div *ngFor="let e of filteredEvents; trackBy: trackEvent" class="feed-item slide-in">
            <div class="feed-dot" [ngClass]="'feed-dot--' + getDotClass(e.eventType)"></div>
            <div class="feed-content">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span class="feed-type">{{ e.eventType }}</span>
                <span class="badge badge--accent" *ngIf="e.route" style="font-size:10px">{{ e.route }}</span>
              </div>
              <div class="feed-detail">{{ e.detail }}</div>
              <div class="feed-detail" *ngIf="e.userId" style="font-size:10px;margin-top:2px">
                User: {{ e.userId }} · Instance: {{ e.instanceId }}
              </div>
            </div>
            <span class="feed-time">{{ e.timestamp | date:'HH:mm:ss' }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: var(--success-bg);
      color: var(--success);
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .live-indicator.disconnected {
      background: var(--error-bg);
      color: var(--error);
      border-color: rgba(248, 113, 113, 0.3);
    }
    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success);
      box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
    }
    .filter-bar {
      display: flex;
      gap: 6px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-muted);
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .filter-btn:hover {
      border-color: var(--border-hover);
      color: var(--text-primary);
    }
    .filter-btn--active {
      background: var(--accent-soft);
      border-color: var(--border-accent);
      color: var(--accent);
      font-weight: 600;
    }
  `]
})
export class RealtimeComponent implements OnInit, OnDestroy {
  events: FeedEvent[] = [];
  filteredEvents: FeedEvent[] = [];
  activeFilter = 'all';
  connected = false;
  eventsPerMinute = 0;
  errorCount = 0;
  uniqueTypes = 0;

  private subs: Subscription[] = [];
  private recentTimestamps: number[] = [];

  constructor(private api: ApiService, private socket: SocketService) {}

  ngOnInit(): void {
    this.connected = true;

    // Load initial events
    this.api.getRecentEvents(50).subscribe({
      next: (res) => {
        const evts = res?.events || [];
        for (const e of evts.reverse()) {
          this.addEvent(e);
        }
        this.applyFilter();
      },
      error: () => {}
    });

    // Subscribe to live events
    this.subs.push(
      this.socket.onNewEvents().subscribe((data: any) => {
        if (data?.latest) {
          this.addEvent(data.latest);
          this.applyFilter();
        }
      })
    );

    this.subs.push(
      this.socket.onNewErrors().subscribe((data: any) => {
        const errors = data?.errors || [];
        for (const err of errors) {
          this.addEvent({ ...err, eventType: err.eventType || 'error' });
        }
        this.applyFilter();
      })
    );

    // Update events/min every 5 seconds
    const interval = setInterval(() => this.updateRate(), 5000);
    this.subs.push({ unsubscribe: () => clearInterval(interval) } as Subscription);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  trackEvent(_: number, e: FeedEvent): string {
    return e.id;
  }

  getDotClass(type: string): string {
    if (type === 'pageview' || type === 'page_time') return 'pageview';
    if (type === 'interaction') return 'interaction';
    if (type === 'error' || type === 'api_error') return 'error';
    if (type === 'api_call') return 'api_call';
    return 'default';
  }

  setFilter(f: string): void {
    this.activeFilter = f;
    this.applyFilter();
  }

  clearFeed(): void {
    this.events = [];
    this.filteredEvents = [];
    this.errorCount = 0;
    this.recentTimestamps = [];
    this.eventsPerMinute = 0;
  }

  private addEvent(raw: any): void {
    const ctx = raw.metadata?._ctx || {};
    const feedEvent: FeedEvent = {
      id: raw.eventId || raw._id || Math.random().toString(36).slice(2),
      eventType: raw.eventType || 'unknown',
      timestamp: new Date(raw.timestamp || Date.now()),
      route: raw.metadata?.route || raw.metadata?.toRoute || '',
      userId: ctx.userId || raw.hashedUserId || '',
      instanceId: raw.instanceId || '',
      detail: this.buildDetail(raw)
    };

    this.events.unshift(feedEvent);
    if (this.events.length > 200) this.events.pop();

    this.recentTimestamps.push(Date.now());
    if (feedEvent.eventType === 'error' || feedEvent.eventType === 'api_error') {
      this.errorCount++;
    }

    const types = new Set(this.events.map(e => e.eventType));
    this.uniqueTypes = types.size;
  }

  private buildDetail(raw: any): string {
    const m = raw.metadata || {};
    switch (raw.eventType) {
      case 'pageview': return `Viewed ${m.route || 'unknown page'}`;
      case 'page_time': return `Spent ${m.timeSpentSeconds || 0}s on ${m.route || 'page'} (${m.activitiesOnPage || 0} activities)`;
      case 'route_change': return `${m.fromRoute || '?'} → ${m.toRoute || '?'}`;
      case 'api_call': return `${m.service || m.url || 'API'} — ${m.responseTime || 0}ms (${m.statusCode || '?'})`;
      case 'error':
      case 'api_error': return m.errorMessage || m.message || 'Error occurred';
      case 'interaction': return `Click on ${m.route || 'page'}`;
      case 'session_start': return 'Session started';
      case 'session_end': return `Session ended (${m.duration || 0}s)`;
      default: return raw.featureName || raw.eventType || '';
    }
  }

  private applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.filteredEvents = [...this.events];
    } else {
      this.filteredEvents = this.events.filter(e => e.eventType === this.activeFilter);
    }
  }

  private updateRate(): void {
    const now = Date.now();
    this.recentTimestamps = this.recentTimestamps.filter(t => now - t < 60000);
    this.eventsPerMinute = this.recentTimestamps.length;
  }
}
