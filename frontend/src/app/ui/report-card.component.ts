import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/** GA-style report module: header + body; optional right-side actions via ng-content. */
@Component({
  selector: 'pulse-report-card',
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }
    `
  ],
  template: `
    <section class="report-card" [class.report-card--tight]="dense">
      <header class="report-card__header">
        <div class="report-card__titles">
          <p class="report-card__kicker" *ngIf="kicker">{{ kicker }}</p>
          <h2 class="report-card__title">{{ title }}</h2>
          <p class="report-card__subtitle" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <div class="report-card__tools">
          <ng-content select="[cardActions]"></ng-content>
        </div>
      </header>
      <div class="report-card__body">
        <ng-content></ng-content>
      </div>
    </section>
  `
})
export class ReportCardComponent {
  @Input({ required: true }) title!: string;
  /** Small uppercase label above the title (GA “module” / Mixpanel panel cue). */
  @Input() kicker = '';
  @Input() subtitle = '';
  /** Smaller vertical padding for dense lists. */
  @Input() dense = false;
}
