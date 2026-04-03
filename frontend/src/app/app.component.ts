import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ReportingContextService } from './services/reporting-context.service';

@Component({
  selector: 'pulse-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <nav class="sidebar" aria-label="Primary">
        <div class="sidebar__brand">
          <span class="sidebar__logo" aria-hidden="true">◉</span>
          <div class="sidebar__brand-text">
            <span class="sidebar__name">Pulse</span>
            <span class="sidebar__tag">Analytics</span>
          </div>
        </div>
        <div class="nav-section">
          <span class="nav-label">Reports</span>
          <a routerLink="/overview" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">dashboard</span>
            </span>
            <span class="nav-item__label">Overview</span>
          </a>
          <a routerLink="/features" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">grid_view</span>
            </span>
            <span class="nav-item__label">Features</span>
          </a>
          <a routerLink="/business-intel" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">payments</span>
            </span>
            <span class="nav-item__label">Business intel</span>
          </a>
          <a routerLink="/instances" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">devices</span>
            </span>
            <span class="nav-item__label">Instances</span>
          </a>
        </div>
        <div class="nav-section">
          <span class="nav-label">Monitoring</span>
          <a routerLink="/errors" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">error</span>
            </span>
            <span class="nav-item__label">Errors</span>
          </a>
          <a routerLink="/uptime" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">monitor_heart</span>
            </span>
            <span class="nav-item__label">Uptime</span>
          </a>
        </div>
        <div class="nav-section">
          <span class="nav-label">Automation</span>
          <a routerLink="/alerts" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">notifications</span>
            </span>
            <span class="nav-item__label">Alerts</span>
          </a>
          <a routerLink="/ai-insights" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">auto_awesome</span>
            </span>
            <span class="nav-item__label">AI insights</span>
          </a>
        </div>
      </nav>
      <div class="main-column">
        <header class="app-topbar">
          <div class="app-topbar__left">
            <span class="app-topbar__eyebrow">Account overview</span>
            <span class="app-topbar__divider" aria-hidden="true"></span>
            <span class="app-topbar__hint">Federated product telemetry</span>
          </div>
          <div class="app-topbar__right">
            <div class="date-range-bar" role="group" aria-label="Reporting window">
              <button
                type="button"
                class="date-range-bar__btn"
                [class.date-range-bar__btn--active]="reporting.days() === 7"
                (click)="reporting.setDays(7)"
              >
                7 days
              </button>
              <button
                type="button"
                class="date-range-bar__btn"
                [class.date-range-bar__btn--active]="reporting.days() === 28"
                (click)="reporting.setDays(28)"
              >
                28 days
              </button>
              <button
                type="button"
                class="date-range-bar__btn"
                [class.date-range-bar__btn--active]="reporting.days() === 30"
                (click)="reporting.setDays(30)"
              >
                30 days
              </button>
            </div>
            <span class="ga-chip">All reports: last {{ reporting.days() }} days</span>
          </div>
        </header>
        <nav class="suite-rail" aria-label="Analytics workspaces">
          <a routerLink="/overview" routerLinkActive="active" class="suite-chip">
            <span class="material-symbols-outlined suite-chip__icon-wrap" aria-hidden="true">dashboard</span>
            <span class="suite-chip__text">
              <span class="suite-chip__name">Event fabric</span>
              <span class="suite-chip__hint">Live funnel &amp; streams</span>
            </span>
          </a>
          <a routerLink="/features" routerLinkActive="active" class="suite-chip">
            <span class="material-symbols-outlined suite-chip__icon-wrap" aria-hidden="true">grid_view</span>
            <span class="suite-chip__text">
              <span class="suite-chip__name">Adoption lab</span>
              <span class="suite-chip__hint">Feature matrix</span>
            </span>
          </a>
          <a routerLink="/business-intel" routerLinkActive="active" class="suite-chip">
            <span class="material-symbols-outlined suite-chip__icon-wrap" aria-hidden="true">payments</span>
            <span class="suite-chip__text">
              <span class="suite-chip__name">Revenue ops</span>
              <span class="suite-chip__hint">Funnel &amp; demand</span>
            </span>
          </a>
          <a routerLink="/instances" routerLinkActive="active" class="suite-chip">
            <span class="material-symbols-outlined suite-chip__icon-wrap" aria-hidden="true">devices</span>
            <span class="suite-chip__text">
              <span class="suite-chip__name">Fleet view</span>
              <span class="suite-chip__hint">Instances &amp; tenants</span>
            </span>
          </a>
          <a routerLink="/errors" routerLinkActive="active" class="suite-chip">
            <span class="material-symbols-outlined suite-chip__icon-wrap" aria-hidden="true">error</span>
            <span class="suite-chip__text">
              <span class="suite-chip__name">Reliability</span>
              <span class="suite-chip__hint">Error intelligence</span>
            </span>
          </a>
          <a routerLink="/uptime" routerLinkActive="active" class="suite-chip">
            <span class="material-symbols-outlined suite-chip__icon-wrap" aria-hidden="true">monitor_heart</span>
            <span class="suite-chip__text">
              <span class="suite-chip__name">Synthetics</span>
              <span class="suite-chip__hint">Uptime &amp; SLO</span>
            </span>
          </a>
          <a routerLink="/alerts" routerLinkActive="active" class="suite-chip">
            <span class="material-symbols-outlined suite-chip__icon-wrap" aria-hidden="true">notifications</span>
            <span class="suite-chip__text">
              <span class="suite-chip__name">Signal desk</span>
              <span class="suite-chip__hint">Alert automation</span>
            </span>
          </a>
          <a routerLink="/ai-insights" routerLinkActive="active" class="suite-chip">
            <span class="material-symbols-outlined suite-chip__icon-wrap" aria-hidden="true">auto_awesome</span>
            <span class="suite-chip__text">
              <span class="suite-chip__name">Copilot</span>
              <span class="suite-chip__hint">AI narratives</span>
            </span>
          </a>
        </nav>
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class AppComponent {
  readonly reporting = inject(ReportingContextService);
}
