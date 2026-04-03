import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'pulse-skeleton-feed',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="skeleton-feed" [attr.aria-busy]="true" aria-label="Loading feed">
      <div class="skeleton-feed__row" *ngFor="let _ of lines">
        <span class="skeleton skeleton--pill"></span>
        <span class="skeleton skeleton--text" style="flex: 1"></span>
        <span class="skeleton skeleton--text skeleton--short"></span>
      </div>
    </div>
  `
})
export class SkeletonFeedComponent {
  @Input() linesCount = 8;

  get lines(): number[] {
    return Array.from({ length: this.linesCount }, (_, i) => i);
  }
}
