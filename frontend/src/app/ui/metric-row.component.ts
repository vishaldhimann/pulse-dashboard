import { Component } from '@angular/core';

/** Responsive row of scorecards; project <pulse-metric-tile> or other cells. */
@Component({
  selector: 'pulse-metric-row',
  standalone: true,
  template: `<div class="metric-row"><ng-content></ng-content></div>`
})
export class MetricRowComponent {}
