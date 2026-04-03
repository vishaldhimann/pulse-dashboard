import { Component, Input } from '@angular/core';

@Component({
  selector: 'pulse-report-grid',
  standalone: true,
  template: `<div class="report-grid" [class.report-grid--single]="columns === 1"><ng-content></ng-content></div>`
})
export class ReportGridComponent {
  /** Max columns on wide screens (1 or 2). */
  @Input() columns: 1 | 2 = 2;
}
