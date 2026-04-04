import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { forkJoin } from 'rxjs';

interface UserRow {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  totalTime: number;
  sessions: number;
  applications: number;
  avgTimePerApp: number;
  events: any[];
}

interface SectionRow {
  route: string;
  totalTime: number;
  visits: number;
  avgTime: number;
  activities: number;
  entries: any[];
}

interface VisitEntry {
  timestamp: Date;
  duration: number;
  activities: number;
  isIdle: boolean;
}

interface ApiCallEntry {
  service: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
}

interface ErrorEntry {
  message: string;
  timestamp: Date;
  route: string;
}

@Component({
  selector: 'pulse-user-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <h1 class="page-header__title">User <span class="gradient-text">Analytics</span></h1>
        <p class="page-header__desc">Drill down from users → application sections → detailed page stats.</p>
      </div>

      <!-- Breadcrumb -->
      <div class="breadcrumb" *ngIf="level > 1">
        <button class="breadcrumb__item" (click)="goToLevel(1)">All Users</button>
        <span class="breadcrumb__sep">›</span>
        <button class="breadcrumb__item" [class.breadcrumb__item--active]="level === 2"
          (click)="goToLevel(2)">{{ selectedUser?.fullName }}</button>
        <ng-container *ngIf="level === 3">
          <span class="breadcrumb__sep">›</span>
          <span class="breadcrumb__item breadcrumb__item--active">{{ selectedSection?.route }}</span>
        </ng-container>
      </div>

      <!-- Loading -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <span>Loading analytics data...</span>
      </div>

      <!-- LEVEL 1: User Overview -->
      <ng-container *ngIf="!loading && level === 1">
        <div class="glass-card">
          <div class="glass-card__header">
            <div>
              <div class="glass-card__title">All Users</div>
              <div class="glass-card__subtitle">{{ users.length }} users tracked · Double-click to drill down</div>
            </div>
            <span class="badge badge--accent">Level 1</span>
          </div>
          <div class="glass-card__body" style="padding: 0;">
            <div *ngIf="!users.length" class="empty-state">
              <span class="material-symbols-outlined" style="font-size:40px;margin-bottom:12px;color:var(--text-muted)">person_off</span>
              <span>No user data found. Events will appear once users interact with tracked applications.</span>
            </div>
            <table class="data-table" *ngIf="users.length">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Total Time</th>
                  <th>Sessions</th>
                  <th>Applications</th>
                  <th>Avg Time / App</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of users; let i = index"
                    class="clickable slide-in"
                    [style.animation-delay]="(i * 30) + 'ms'"
                    (dblclick)="selectUser(u)">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="user-avatar">{{ u.fullName.charAt(0) }}</div>
                      <div>
                        <div style="font-weight:600;color:var(--text-primary)">{{ u.fullName }}</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-variant-numeric:tabular-nums;font-weight:600;color:var(--accent)">{{ formatDuration(u.totalTime) }}</td>
                  <td><span class="badge badge--info">{{ u.sessions }}</span></td>
                  <td>{{ u.applications }}</td>
                  <td>{{ formatDuration(u.avgTimePerApp) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- LEVEL 2: Application Sections -->
      <ng-container *ngIf="!loading && level === 2 && selectedUser">
        <div class="kpi-grid" style="margin-bottom:24px">
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--indigo">
              <span class="material-symbols-outlined">person</span>
            </div>
            <div class="kpi-card__label">User</div>
            <div class="kpi-card__value" style="font-size:20px">{{ selectedUser.fullName }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--purple">
              <span class="material-symbols-outlined">timer</span>
            </div>
            <div class="kpi-card__label">Total Time</div>
            <div class="kpi-card__value">{{ formatDuration(selectedUser.totalTime) }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--green">
              <span class="material-symbols-outlined">login</span>
            </div>
            <div class="kpi-card__label">Sessions</div>
            <div class="kpi-card__value">{{ selectedUser.sessions }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--pink">
              <span class="material-symbols-outlined">description</span>
            </div>
            <div class="kpi-card__label">Pages Visited</div>
            <div class="kpi-card__value">{{ sections.length }}</div>
          </div>
        </div>

        <div class="glass-card">
          <div class="glass-card__header">
            <div>
              <div class="glass-card__title">Application Sections</div>
              <div class="glass-card__subtitle">Pages visited by {{ selectedUser.fullName }} · Double-click for details</div>
            </div>
            <span class="badge badge--accent">Level 2</span>
          </div>
          <div class="glass-card__body" style="padding:0">
            <table class="data-table" *ngIf="sections.length">
              <thead>
                <tr>
                  <th>Route / Page</th>
                  <th>Total Time</th>
                  <th>Visits</th>
                  <th>Avg Time / Visit</th>
                  <th>Activities</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of sections; let i = index"
                    class="clickable slide-in"
                    [style.animation-delay]="(i * 30) + 'ms'"
                    (dblclick)="selectSection(s)">
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <span class="material-symbols-outlined" style="font-size:16px;color:var(--accent)">web</span>
                      <span class="mono" style="color:var(--text-primary)">{{ s.route }}</span>
                    </div>
                  </td>
                  <td style="font-variant-numeric:tabular-nums;font-weight:600;color:var(--accent)">{{ formatDuration(s.totalTime) }}</td>
                  <td><span class="badge badge--info">{{ s.visits }}</span></td>
                  <td>{{ formatDuration(s.avgTime) }}</td>
                  <td>
                    <span class="badge badge--accent">{{ s.activities }} clicks</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="!sections.length" class="empty-state">No page visits found for this user.</div>
          </div>
        </div>
      </ng-container>

      <!-- LEVEL 3: Detailed Page Stats -->
      <ng-container *ngIf="!loading && level === 3 && selectedSection">
        <div class="kpi-grid" style="margin-bottom:24px">
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--indigo">
              <span class="material-symbols-outlined">web</span>
            </div>
            <div class="kpi-card__label">Page</div>
            <div class="kpi-card__value mono" style="font-size:14px">{{ selectedSection.route }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--purple">
              <span class="material-symbols-outlined">timer</span>
            </div>
            <div class="kpi-card__label">Total Time</div>
            <div class="kpi-card__value">{{ formatDuration(selectedSection.totalTime) }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--green">
              <span class="material-symbols-outlined">visibility</span>
            </div>
            <div class="kpi-card__label">Total Visits</div>
            <div class="kpi-card__value">{{ selectedSection.visits }}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__icon kpi-card__icon--amber">
              <span class="material-symbols-outlined">hotel</span>
            </div>
            <div class="kpi-card__label">Idle Visits</div>
            <div class="kpi-card__value">{{ idleCount }}</div>
          </div>
        </div>

        <!-- Individual Visits -->
        <div class="glass-card" style="margin-bottom:24px">
          <div class="glass-card__header">
            <div>
              <div class="glass-card__title">Individual Visit Entries</div>
              <div class="glass-card__subtitle">Each time the user visited this page</div>
            </div>
          </div>
          <div class="glass-card__body" style="padding:0">
            <table class="data-table" *ngIf="visitEntries.length">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Duration</th>
                  <th>Activities</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let v of visitEntries; let i = index" class="slide-in" [style.animation-delay]="(i*25)+'ms'">
                  <td class="mono">{{ v.timestamp | date:'MMM d, y HH:mm:ss' }}</td>
                  <td style="font-weight:600;color:var(--accent)">{{ formatDuration(v.duration) }}</td>
                  <td>{{ v.activities }} clicks</td>
                  <td>
                    <span class="badge" [class.badge--warning]="v.isIdle" [class.badge--success]="!v.isIdle">
                      {{ v.isIdle ? 'Idle' : 'Active' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="!visitEntries.length" class="empty-state">No individual visit data available.</div>
          </div>
        </div>

        <!-- API Calls on this page -->
        <div class="glass-card" style="margin-bottom:24px">
          <div class="glass-card__header">
            <div>
              <div class="glass-card__title">API Calls on This Page</div>
              <div class="glass-card__subtitle">{{ apiCalls.length }} API calls recorded</div>
            </div>
          </div>
          <div class="glass-card__body" style="padding:0">
            <table class="data-table" *ngIf="apiCalls.length">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Response Time</th>
                  <th>Status Code</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let a of apiCalls; let i = index" class="slide-in" [style.animation-delay]="(i*25)+'ms'">
                  <td class="mono" style="color:var(--text-primary)">{{ a.service }}</td>
                  <td>
                    <span [style.color]="a.responseTime > 1000 ? 'var(--error)' : a.responseTime > 500 ? 'var(--warning)' : 'var(--success)'"
                          style="font-weight:600">
                      {{ a.responseTime }}ms
                    </span>
                  </td>
                  <td>
                    <span class="badge" [class.badge--success]="a.statusCode < 400" [class.badge--error]="a.statusCode >= 400">
                      {{ a.statusCode }}
                    </span>
                  </td>
                  <td class="mono" style="color:var(--text-muted)">{{ a.timestamp | date:'HH:mm:ss' }}</td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="!apiCalls.length" class="empty-state">No API calls recorded on this page.</div>
          </div>
        </div>

        <!-- Errors on this page -->
        <div class="glass-card" style="margin-bottom:24px">
          <div class="glass-card__header">
            <div>
              <div class="glass-card__title">Errors on This Page</div>
              <div class="glass-card__subtitle">{{ pageErrors.length }} errors recorded</div>
            </div>
            <span class="badge badge--error" *ngIf="pageErrors.length">{{ pageErrors.length }}</span>
          </div>
          <div class="glass-card__body" style="padding:0">
            <table class="data-table" *ngIf="pageErrors.length">
              <thead>
                <tr>
                  <th>Error Message</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let e of pageErrors; let i = index" class="slide-in" [style.animation-delay]="(i*25)+'ms'">
                  <td class="mono" style="color:var(--error)">{{ e.message }}</td>
                  <td class="mono" style="color:var(--text-muted)">{{ e.timestamp | date:'MMM d, HH:mm:ss' }}</td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="!pageErrors.length" class="empty-state" style="padding:24px">
              <span class="material-symbols-outlined" style="color:var(--success);font-size:28px;margin-bottom:8px">check_circle</span>
              No errors on this page
            </div>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
  `]
})
export class UserAnalyticsComponent implements OnInit, OnDestroy {
  level = 1;
  loading = true;

  // All raw events
  allEvents: any[] = [];

  // Level 1
  users: UserRow[] = [];

  // Level 2
  selectedUser: UserRow | null = null;
  sections: SectionRow[] = [];

  // Level 3
  selectedSection: SectionRow | null = null;
  visitEntries: VisitEntry[] = [];
  apiCalls: ApiCallEntry[] = [];
  pageErrors: ErrorEntry[] = [];
  idleCount = 0;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadAllEvents();
  }

  ngOnDestroy(): void {}

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

  goToLevel(l: number): void {
    this.level = l;
    if (l === 1) {
      this.selectedUser = null;
      this.selectedSection = null;
      this.sections = [];
    }
    if (l === 2 && this.selectedUser) {
      this.selectedSection = null;
      this.buildSections(this.selectedUser);
    }
  }

  selectUser(u: UserRow): void {
    this.selectedUser = u;
    this.level = 2;
    this.buildSections(u);
  }

  selectSection(s: SectionRow): void {
    this.selectedSection = s;
    this.level = 3;
    this.buildDetailedStats(s);
  }

  private loadAllEvents(): void {
    this.loading = true;
    // Load a large batch of events to process client-side
    forkJoin([
      this.api.getEvents({ limit: 5000 }),
      this.api.getEventsByType('page_time', 2000),
      this.api.getEventsByType('api_call', 1000),
      this.api.getEventsByType('error', 500)
    ]).subscribe({
      next: ([allRes, pageTimeRes, apiRes, errorRes]) => {
        const all = allRes?.events || [];
        const pageTime = pageTimeRes?.events || [];
        const apiEvents = apiRes?.events || [];
        const errorEvents = errorRes?.events || [];

        // Merge and deduplicate by eventId
        const map = new Map<string, any>();
        [...all, ...pageTime, ...apiEvents, ...errorEvents].forEach(e => {
          map.set(e.eventId || e._id, e);
        });
        this.allEvents = Array.from(map.values());
        this.buildUsers();
        this.loading = false;
      },
      error: () => {
        this.allEvents = [];
        this.users = [];
        this.loading = false;
      }
    });
  }

  private buildUsers(): void {
    const userMap = new Map<string, any[]>();

    for (const evt of this.allEvents) {
      const ctx = evt.metadata?._ctx || evt.metadata || {};
      const userId = ctx.userId || evt.hashedUserId || 'anonymous';
      if (userId === 'anonymous') continue;
      if (!userMap.has(userId)) userMap.set(userId, []);
      userMap.get(userId)!.push(evt);
    }

    this.users = Array.from(userMap.entries()).map(([userId, events]) => {
      const ctx = events.find((e: any) => e.metadata?._ctx?.firstName)?.metadata?._ctx || {};
      const firstName = ctx.firstName || '';
      const lastName = ctx.lastName || '';
      const fullName = (firstName + ' ' + lastName).trim() || userId;

      // Total time from page_time events
      const pageTimeEvents = events.filter((e: any) => e.eventType === 'page_time');
      const totalTime = pageTimeEvents.reduce((sum: number, e: any) => sum + (e.metadata?.timeSpentSeconds || 0), 0);

      // Sessions from session_start events or unique sessionIds
      const sessionIds = new Set(events.map((e: any) => e.metadata?._ctx?.sessionId).filter(Boolean));
      const sessionStarts = events.filter((e: any) => e.eventType === 'session_start').length;
      const sessions = Math.max(sessionIds.size, sessionStarts, 1);

      // Applications (unique loanIds or appIds)
      const appIds = new Set(events.map((e: any) => e.metadata?._ctx?.loanId || e.metadata?._ctx?.appId).filter(Boolean));
      const applications = Math.max(appIds.size, 1);

      const avgTimePerApp = applications > 0 ? totalTime / applications : 0;

      return { userId, firstName, lastName, fullName, totalTime, sessions, applications, avgTimePerApp, events };
    }).sort((a, b) => b.totalTime - a.totalTime);
  }

  private buildSections(user: UserRow): void {
    const routeMap = new Map<string, any[]>();

    for (const evt of user.events) {
      const route = evt.metadata?.route || evt.metadata?._ctx?.currentState || evt.metadata?.fromRoute || '';
      if (!route) continue;
      if (!routeMap.has(route)) routeMap.set(route, []);
      routeMap.get(route)!.push(evt);
    }

    this.sections = Array.from(routeMap.entries()).map(([route, events]) => {
      const pageTimeEvents = events.filter((e: any) => e.eventType === 'page_time');
      const totalTime = pageTimeEvents.reduce((sum: number, e: any) => sum + (e.metadata?.timeSpentSeconds || 0), 0);
      const visits = Math.max(pageTimeEvents.length, events.filter((e: any) => e.eventType === 'pageview').length, 1);
      const avgTime = visits > 0 ? totalTime / visits : 0;
      const activities = pageTimeEvents.reduce((sum: number, e: any) => sum + (e.metadata?.activitiesOnPage || 0), 0)
        + events.filter((e: any) => e.eventType === 'interaction').length;

      return { route, totalTime, visits, avgTime, activities, entries: events };
    }).sort((a, b) => b.totalTime - a.totalTime);
  }

  private buildDetailedStats(section: SectionRow): void {
    const events = section.entries;

    // Visit entries from page_time events
    this.visitEntries = events
      .filter((e: any) => e.eventType === 'page_time')
      .map((e: any) => ({
        timestamp: new Date(e.timestamp),
        duration: e.metadata?.timeSpentSeconds || 0,
        activities: e.metadata?.activitiesOnPage || 0,
        isIdle: (e.metadata?.activitiesOnPage || 0) === 0
      }))
      .sort((a: VisitEntry, b: VisitEntry) => b.timestamp.getTime() - a.timestamp.getTime());

    this.idleCount = this.visitEntries.filter(v => v.isIdle).length;

    // API calls
    this.apiCalls = events
      .filter((e: any) => e.eventType === 'api_call')
      .map((e: any) => ({
        service: e.metadata?.service || e.metadata?.url || 'unknown',
        responseTime: e.metadata?.responseTime || 0,
        statusCode: e.metadata?.statusCode || 0,
        timestamp: new Date(e.timestamp)
      }))
      .sort((a: ApiCallEntry, b: ApiCallEntry) => b.timestamp.getTime() - a.timestamp.getTime());

    // Errors
    this.pageErrors = events
      .filter((e: any) => e.eventType === 'error' || e.eventType === 'api_error')
      .map((e: any) => ({
        message: e.metadata?.errorMessage || e.metadata?.message || 'Unknown error',
        timestamp: new Date(e.timestamp),
        route: section.route
      }))
      .sort((a: ErrorEntry, b: ErrorEntry) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
