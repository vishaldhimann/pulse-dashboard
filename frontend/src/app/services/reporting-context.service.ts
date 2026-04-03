import { Injectable, signal } from '@angular/core';

/** Global reporting window — GA-style presets shared across charts and tables. */
@Injectable({ providedIn: 'root' })
export class ReportingContextService {
  private static readonly ALLOWED = new Set<number>([7, 28, 30]);

  /** Lookback in days for endpoints that support `?days=`. */
  readonly days = signal(30);

  setDays(n: number): void {
    const v = ReportingContextService.ALLOWED.has(n) ? n : 30;
    this.days.set(v);
  }
}
