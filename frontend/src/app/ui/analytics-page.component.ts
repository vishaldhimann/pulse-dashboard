import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** GA-style page frame: title row, optional actions slot, then body. */
@Component({
  selector: 'pulse-analytics-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-page">
      <header class="analytics-page__head">
        <div class="analytics-page__titles">
          <h1 class="analytics-page__title">{{ title }}</h1>
          <p class="analytics-page__desc" *ngIf="description">{{ description }}</p>
        </div>
        <div class="analytics-page__actions">
          <ng-content select="[pageActions]"></ng-content>
        </div>
      </header>
      <ng-content></ng-content>
    </div>
  `
})
export class AnalyticsPageComponent {
  @Input({ required: true }) title!: string;
  @Input() description = '';
}
