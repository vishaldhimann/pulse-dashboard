import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'pulse-skeleton-table',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="skeleton-table" [attr.aria-busy]="true" aria-label="Loading table">
      <div class="skeleton-table__row skeleton-table__row--head">
        <span class="skeleton skeleton--text" *ngFor="let _ of headCells" style="flex: 1"></span>
      </div>
      <div class="skeleton-table__row" *ngFor="let _ of bodyRows">
        <span class="skeleton skeleton--text" *ngFor="let __ of headCells" style="flex: 1"></span>
      </div>
    </div>
  `
})
export class SkeletonTableComponent {
  @Input() cols = 5;
  @Input() rows = 6;

  get headCells(): number[] {
    return Array.from({ length: this.cols }, (_, i) => i);
  }

  get bodyRows(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
