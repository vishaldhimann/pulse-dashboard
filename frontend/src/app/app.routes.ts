import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  { path: 'overview', loadComponent: () => import('./pages/overview/overview.component').then(m => m.OverviewComponent) },
  { path: 'user-analytics', loadComponent: () => import('./pages/user-analytics/user-analytics.component').then(m => m.UserAnalyticsComponent) },
  { path: 'route-analytics', loadComponent: () => import('./pages/route-analytics/route-analytics.component').then(m => m.RouteAnalyticsComponent) },
  { path: 'errors', loadComponent: () => import('./pages/errors/errors.component').then(m => m.ErrorsComponent) },
  { path: 'realtime', loadComponent: () => import('./pages/realtime/realtime.component').then(m => m.RealtimeComponent) },
];
