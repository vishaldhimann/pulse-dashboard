import { Component, Input } from '@angular/core';

@Component({
  selector: 'pulse-spinner',
  standalone: true,
  template: `
    <span
      class="pulse-spinner"
      [class.pulse-spinner--sm]="size === 'sm'"
      [class.pulse-spinner--lg]="size === 'lg'"
      role="status"
      aria-label="Loading"
    ></span>
  `
})
export class SpinnerComponent {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
