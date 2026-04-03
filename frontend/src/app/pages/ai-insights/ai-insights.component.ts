import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import {
  AnalyticsPageComponent,
  MetricRowComponent,
  MetricTileComponent,
  ReportCardComponent,
  SpinnerComponent
} from '../../ui';

@Component({
  selector: 'pulse-ai-insights',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AnalyticsPageComponent,
    MetricRowComponent,
    MetricTileComponent,
    ReportCardComponent,
    SpinnerComponent
  ],
  template: `
    <pulse-analytics-page
      title="AI insights"
      description="Ask questions, generate narrative summaries, and score churn risk—in one place, with GA-style cards and actions."
    >
      <pulse-report-card
        title="Ask Pulse"
        subtitle="Natural language over merged server-side context. Answers reflect the latest rolled-up telemetry."
      >
        <div class="form-row">
          <input
            type="text"
            [(ngModel)]="question"
            placeholder="e.g. Which instance needs attention?"
            (keyup.enter)="askPulse()"
            class="input-field"
          />
          <button
            type="button"
            class="btn btn-primary"
            [class.btn--busy]="asking"
            (click)="askPulse()"
            [disabled]="asking"
          >
            <pulse-spinner *ngIf="asking" size="sm"></pulse-spinner>
            <span *ngIf="!asking" class="material-symbols-outlined btn__icon" aria-hidden="true">send</span>
            {{ asking ? 'Thinking…' : 'Ask' }}
          </button>
        </div>
        <div *ngIf="chatAnswer" class="ai-response">
          <div class="ai-label">Response</div>
          <pre class="ai-text">{{ chatAnswer }}</pre>
        </div>
      </pulse-report-card>

      <pulse-report-card
        title="Auto-generated insights"
        subtitle="One-click digest of recent behavioral and reliability patterns."
      >
        <button
          type="button"
          class="btn btn-primary"
          [class.btn--busy]="generating"
          (click)="generateInsights()"
          [disabled]="generating"
        >
          <pulse-spinner *ngIf="generating" size="sm"></pulse-spinner>
          <span *ngIf="!generating" class="material-symbols-outlined btn__icon" aria-hidden="true">auto_awesome</span>
          {{ generating ? 'Generating…' : 'Generate insights' }}
        </button>
        <pre *ngIf="insights" class="ai-text ai-text--block">{{ insights }}</pre>
      </pulse-report-card>

      <pulse-report-card
        title="Churn prediction"
        subtitle="Instance-level risk score and summary from the prediction service."
      >
        <div class="form-row">
          <input type="text" [(ngModel)]="churnInstanceId" placeholder="Instance ID" class="input-field" />
          <button
            type="button"
            class="btn btn-primary"
            [class.btn--busy]="predicting"
            (click)="predictChurn()"
            [disabled]="predicting"
          >
            <pulse-spinner *ngIf="predicting" size="sm"></pulse-spinner>
            <span *ngIf="!predicting" class="material-symbols-outlined btn__icon" aria-hidden="true">analytics</span>
            {{ predicting ? 'Analyzing…' : 'Predict churn' }}
          </button>
        </div>
        <div *ngIf="churnResult" class="ai-response">
          <pulse-metric-row>
            <pulse-metric-tile
              label="Risk score"
              [numberValue]="churnResult.prediction?.riskScore ?? null"
              [variant]="(churnResult.prediction?.riskScore ?? 0) > 70 ? 'danger' : 'default'"
            ></pulse-metric-tile>
          </pulse-metric-row>
          <pre class="ai-text">{{ churnResult.prediction?.summary || (churnResult.prediction | json) }}</pre>
        </div>
      </pulse-report-card>
    </pulse-analytics-page>
  `
})
export class AiInsightsComponent {
  question = '';
  chatAnswer = '';
  asking = false;
  insights = '';
  generating = false;
  churnInstanceId = '';
  churnResult: any;
  predicting = false;

  constructor(private api: ApiService) {}

  askPulse() {
    if (!this.question.trim()) return;
    this.asking = true;
    this.api.askPulse(this.question).subscribe({
      next: d => {
        this.chatAnswer = d.answer;
      },
      complete: () => {
        this.asking = false;
      },
      error: () => {
        this.asking = false;
      }
    });
  }

  generateInsights() {
    this.generating = true;
    this.api.getInsights().subscribe({
      next: d => {
        this.insights = d.insights;
      },
      complete: () => {
        this.generating = false;
      },
      error: () => {
        this.generating = false;
      }
    });
  }

  predictChurn() {
    if (!this.churnInstanceId.trim()) return;
    this.predicting = true;
    this.api.predictChurn(this.churnInstanceId).subscribe({
      next: d => {
        this.churnResult = d;
      },
      complete: () => {
        this.predicting = false;
      },
      error: () => {
        this.predicting = false;
      }
    });
  }
}
