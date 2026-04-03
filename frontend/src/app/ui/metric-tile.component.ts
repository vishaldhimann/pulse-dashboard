import { Component, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

export type MetricTileVariant = 'default' | 'danger' | 'accent';

/** Tone for the comparison row (GA / Mixpanel scorecard helper). */
export type MetricComparisonTone = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'pulse-metric-tile',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  template: `
    <div
      class="metric-tile"
      [class.metric-tile--danger]="variant === 'danger'"
      [class.metric-tile--accent]="variant === 'accent'"
    >
      <div class="metric-tile__label">{{ label }}</div>
      <div class="metric-tile__value">
        <ng-container *ngIf="useNumberPipe; else rawVal">{{ numberForPipe | number }}</ng-container>
        <ng-template #rawVal>{{ displayRaw }}</ng-template>
      </div>
      <div class="metric-tile__comparison" *ngIf="comparison" [class]="comparisonClass">
        <span
          class="material-symbols-outlined metric-tile__comparison-icon"
          *ngIf="comparisonTone !== 'neutral'"
          aria-hidden="true"
          >{{ comparisonIcon }}</span
        >
        <span class="metric-tile__comparison-text">{{ comparison }}</span>
      </div>
      <div class="metric-tile__hint" *ngIf="hint">{{ hint }}</div>
    </div>
  `
})
export class MetricTileComponent {
  @Input({ required: true }) label!: string;
  /** When set, formatted with DecimalPipe. */
  @Input() numberValue: number | null | undefined;
  /** When numberValue is undefined, show this string (e.g. pre-formatted). */
  @Input() textValue: string | null | undefined;
  @Input() hint = '';
  /** Secondary fact under the value, e.g. “12.4% of 7-day volume”. */
  @Input() comparison = '';
  @Input() comparisonTone: MetricComparisonTone = 'neutral';
  @Input() variant: MetricTileVariant = 'default';

  get comparisonClass(): string {
    return `metric-tile__comparison--${this.comparisonTone}`;
  }

  get comparisonIcon(): string {
    if (this.comparisonTone === 'positive') return 'trending_up';
    if (this.comparisonTone === 'negative') return 'trending_down';
    return 'subtitles';
  }

  get useNumberPipe(): boolean {
    return this.numberValue !== null && this.numberValue !== undefined && !Number.isNaN(this.numberValue as number);
  }

  get numberForPipe(): number {
    return this.numberValue as number;
  }

  get displayRaw(): string {
    if (this.textValue !== null && this.textValue !== undefined && this.textValue !== '') {
      return this.textValue;
    }
    return '—';
  }
}
