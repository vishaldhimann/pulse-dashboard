import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'overview', pathMatch: 'full' },
  { path: 'overview', loadComponent: () => import('./pages/overview/overview.component').then(m => m.OverviewComponent) },
  { path: 'features', loadComponent: () => import('./pages/features/features.component').then(m => m.FeaturesComponent) },
  { path: 'business-intel', loadComponent: () => import('./pages/business-intel/business-intel.component').then(m => m.BusinessIntelComponent) },
  { path: 'instances', loadComponent: () => import('./pages/instances/instances.component').then(m => m.InstancesComponent) },
  { path: 'errors', loadComponent: () => import('./pages/errors/errors.component').then(m => m.ErrorsComponent) },
  { path: 'uptime', loadComponent: () => import('./pages/uptime/uptime.component').then(m => m.UptimeComponent) },
  { path: 'alerts', loadComponent: () => import('./pages/alerts/alerts.component').then(m => m.AlertsComponent) },
  { path: 'ai-insights', loadComponent: () => import('./pages/ai-insights/ai-insights.component').then(m => m.AiInsightsComponent) },
];
