import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'pulse-skeleton-metric-row',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="metric-row metric-row--skeleton" [attr.aria-busy]="true" aria-label="Loading metrics">
      <div class="skeleton skeleton--metric" *ngFor="let _ of cells"></div>
    </div>
  `
})
export class SkeletonMetricRowComponent {
  @Input() count = 5;

  get cells(): number[] {
    return Array.from({ length: Math.max(1, this.count) }, (_, i) => i);
  }
}
