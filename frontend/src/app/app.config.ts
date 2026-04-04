import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';
import { Chart, defaults } from 'chart.js';

// Global Chart.js defaults — black text, bigger fonts on all charts
defaults.color = '#111827';
defaults.font.family = 'Inter, sans-serif';
defaults.font.size = 13;
defaults.plugins.legend.labels.color = '#111827';
defaults.plugins.legend.labels.font = { family: 'Inter, sans-serif', size: 13 };
defaults.scale = defaults.scale || {} as any;

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient()
  ]
};
