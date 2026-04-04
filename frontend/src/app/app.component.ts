import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ReportingContextService } from './services/reporting-context.service';

@Component({
  selector: 'pulse-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-layout">
      <nav class="sidebar" aria-label="Primary navigation">
        <div class="sidebar__brand">
          <div class="sidebar__logo" aria-hidden="true">P</div>
          <div class="sidebar__brand-text">
            <span class="sidebar__name">Pulse</span>
            <span class="sidebar__tag">Analytics</span>
          </div>
        </div>

        <div class="nav-section">
          <span class="nav-label">Analytics</span>
          <a routerLink="/overview" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">dashboard</span>
            </span>
            <span class="nav-item__label">Overview</span>
          </a>
          <a routerLink="/user-analytics" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">person_search</span>
            </span>
            <span class="nav-item__label">User Analytics</span>
          </a>
          <a routerLink="/route-analytics" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">route</span>
            </span>
            <span class="nav-item__label">Route Analytics</span>
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
          <a routerLink="/realtime" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap">
              <span class="material-symbols-outlined nav-item__icon" aria-hidden="true">stream</span>
            </span>
            <span class="nav-item__label">Real-time Feed</span>
          </a>
        </div>
      </nav>

      <div class="main-column">
        <header class="app-topbar">
          <div class="app-topbar__left">
            <span class="app-topbar__eyebrow">Pulse Analytics</span>
            <span class="app-topbar__divider" aria-hidden="true"></span>
            <span class="app-topbar__hint">Product telemetry dashboard</span>
          </div>
          <div class="app-topbar__right">
          </div>
        </header>

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
