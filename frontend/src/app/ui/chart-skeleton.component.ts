import { Component } from '@angular/core';

@Component({
  selector: 'pulse-chart-skeleton',
  standalone: true,
  template: `
    <div class="chart-skeleton" aria-hidden="true">
      <div class="chart-skeleton__header">
        <span class="skeleton skeleton--text skeleton--short"></span>
      </div>
      <div class="chart-skeleton__plot">
        <div class="skeleton chart-skeleton__bar" style="width: 72%"></div>
        <div class="skeleton chart-skeleton__bar" style="width: 91%"></div>
        <div class="skeleton chart-skeleton__bar" style="width: 55%"></div>
        <div class="skeleton chart-skeleton__bar" style="width: 84%"></div>
        <div class="skeleton chart-skeleton__bar" style="width: 63%"></div>
        <div class="skeleton chart-skeleton__bar" style="width: 78%"></div>
      </div>
    </div>
  `
})
export class ChartSkeletonComponent {}
