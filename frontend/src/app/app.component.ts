import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportingContextService } from './services/reporting-context.service';
import { ApiService } from './services/api.service';

interface ChatMsg { role: 'user'|'assistant'; content: string; ts: Date; }

@Component({
  selector: 'pulse-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  template: `
    <div class="app-layout">
      <nav class="sidebar">
        <div class="sidebar__brand">
          <div class="sidebar__logo">P</div>
          <div class="sidebar__brand-text">
            <span class="sidebar__name">Pulse</span>
            <span class="sidebar__tag">Analytics</span>
          </div>
        </div>
        <div class="nav-section">
          <span class="nav-label">Analytics</span>
          <a routerLink="/overview" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap"><span class="material-symbols-outlined nav-item__icon">dashboard</span></span>
            <span class="nav-item__label">Overview</span>
          </a>
          <a routerLink="/user-analytics" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap"><span class="material-symbols-outlined nav-item__icon">person_search</span></span>
            <span class="nav-item__label">User Analytics</span>
          </a>
          <a routerLink="/route-analytics" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap"><span class="material-symbols-outlined nav-item__icon">route</span></span>
            <span class="nav-item__label">Route Analytics</span>
          </a>
        </div>
        <div class="nav-section">
          <span class="nav-label">Monitoring</span>
          <a routerLink="/errors" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap"><span class="material-symbols-outlined nav-item__icon">error</span></span>
            <span class="nav-item__label">Errors</span>
          </a>
          <a routerLink="/realtime" routerLinkActive="active" class="nav-item">
            <span class="nav-item__icon-wrap"><span class="material-symbols-outlined nav-item__icon">stream</span></span>
            <span class="nav-item__label">Real-time Feed</span>
          </a>
        </div>
      </nav>

      <div class="main-column">
        <header class="app-topbar">
          <div class="app-topbar__left">
            <span class="app-topbar__eyebrow">Pulse Analytics</span>
            <span class="app-topbar__divider"></span>
            <span class="app-topbar__hint">Product telemetry dashboard</span>
          </div>
          <div class="app-topbar__right"></div>
        </header>
        <main class="content">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- FAB -->
      <button class="chat-fab" (click)="chatOpen = !chatOpen" [class.chat-fab--open]="chatOpen">
        <span class="material-symbols-outlined" *ngIf="!chatOpen">smart_toy</span>
        <span class="material-symbols-outlined" *ngIf="chatOpen">close</span>
      </button>

      <!-- Chat Panel -->
      <div class="chat-panel" [class.chat-panel--open]="chatOpen">
        <div class="chat-panel__header">
          <div>
            <div class="chat-panel__title">Pulse AI</div>
            <div class="chat-panel__sub">Ask anything about your data</div>
          </div>
          <button class="chat-panel__close" (click)="chatOpen = false">
            <span class="material-symbols-outlined" style="font-size:18px">close</span>
          </button>
        </div>

        <div class="chat-panel__suggestions" *ngIf="msgs.length === 0">
          <button *ngFor="let s of suggestions" class="chat-chip" (click)="ask(s)">{{ s }}</button>
        </div>

        <div class="chat-panel__messages">
          <div *ngFor="let m of msgs" class="chat-bubble" [class.chat-bubble--user]="m.role==='user'" [class.chat-bubble--ai]="m.role==='assistant'">
            <div class="chat-bubble__icon">
              <span class="material-symbols-outlined" style="font-size:16px">{{ m.role === 'user' ? 'person' : 'smart_toy' }}</span>
            </div>
            <div class="chat-bubble__body">
              <div class="chat-bubble__name">{{ m.role === 'user' ? 'You' : 'Pulse AI' }}</div>
              <div class="chat-bubble__text" [innerHTML]="fmt(m.content)"></div>
            </div>
          </div>
          <div *ngIf="loading" class="chat-bubble chat-bubble--ai">
            <div class="chat-bubble__icon"><span class="material-symbols-outlined" style="font-size:16px;color:var(--accent)">smart_toy</span></div>
            <div class="chat-bubble__body"><div class="chat-bubble__name">Pulse AI</div><div class="typing"><span></span><span></span><span></span></div></div>
          </div>
        </div>

        <div class="chat-panel__input">
          <input type="text" [(ngModel)]="q" placeholder="Ask about your data..." (keyup.enter)="send()" [disabled]="loading" />
          <button (click)="send()" [disabled]="loading || !q.trim()">
            <span class="material-symbols-outlined" style="font-size:18px">send</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 100;
      width: 52px; height: 52px; border-radius: 16px; border: none;
      background: linear-gradient(135deg, var(--accent-start), var(--accent-end));
      color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(79,70,229,0.35);
      transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    .chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(79,70,229,0.45); }
    .chat-fab--open { border-radius: 12px; background: var(--text-muted); box-shadow: var(--shadow-md); }

    .chat-panel {
      position: fixed; top: 0; right: -480px; width: 460px; height: 100vh; z-index: 99;
      background: var(--bg-primary); border-left: 1px solid var(--border);
      display: flex; flex-direction: column; box-shadow: -4px 0 32px rgba(0,0,0,0.08);
      transition: right 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    .chat-panel--open { right: 0; }

    .chat-panel__header {
      padding: 20px 24px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    .chat-panel__title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .chat-panel__sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .chat-panel__close { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 6px; }
    .chat-panel__close:hover { background: var(--bg-secondary); color: var(--text-primary); }

    .chat-panel__suggestions { padding: 16px 24px; display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0; }
    .chat-chip {
      padding: 6px 14px; border-radius: 999px; border: 1px solid var(--border);
      background: var(--bg-primary); color: var(--text-secondary); font-size: 11px;
      cursor: pointer; transition: all 0.15s; font-family: var(--font-sans);
    }
    .chat-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

    .chat-panel__messages { flex: 1; overflow-y: auto; padding: 16px 24px; display: flex; flex-direction: column; gap: 14px; }

    .chat-bubble { display: flex; gap: 10px; max-width: 92%; animation: fadeIn 0.2s ease; }
    .chat-bubble--user { align-self: flex-end; flex-direction: row-reverse; }
    .chat-bubble--ai { align-self: flex-start; }
    .chat-bubble__icon {
      width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; background: var(--bg-secondary); border: 1px solid var(--border);
    }
    .chat-bubble--user .chat-bubble__icon { background: var(--accent-soft); }
    .chat-bubble__body { padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-primary); }
    .chat-bubble--user .chat-bubble__body { background: var(--accent-soft); border-color: var(--border-accent); }
    .chat-bubble__name { font-size: 10px; font-weight: 600; color: var(--text-muted); margin-bottom: 3px; }
    .chat-bubble__text { font-size: 13px; line-height: 1.65; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; }

    .chat-panel__input {
      padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 8px; flex-shrink: 0;
    }
    .chat-panel__input input {
      flex: 1; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-sans);
      font-size: 13px; outline: none;
    }
    .chat-panel__input input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .chat-panel__input button {
      width: 40px; height: 40px; border-radius: 10px; border: none;
      background: var(--accent); color: white; cursor: pointer; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .chat-panel__input button:disabled { opacity: 0.4; cursor: not-allowed; }
    .chat-panel__input button:hover:not(:disabled) { background: var(--accent-hover); }

    .typing { display: flex; gap: 4px; padding: 4px 0; }
    .typing span { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: bounce 1.2s ease-in-out infinite; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  `]
})
export class AppComponent {
  readonly reporting = inject(ReportingContextService);
  private api = inject(ApiService);

  chatOpen = false;
  loading = false;
  q = '';
  msgs: ChatMsg[] = [];
  suggestions = [
    'Which page do users spend the most time on?',
    'What is the error rate today?',
    'How many users are active?',
    'Which API calls are slowest?',
    'Summarize today\'s activity'
  ];

  ask(s: string) { this.q = s; this.send(); }

  send() {
    const text = this.q.trim();
    if (!text || this.loading) return;
    this.msgs.push({ role: 'user', content: text, ts: new Date() });
    this.q = '';
    this.loading = true;
    this.scroll();

    this.api.askPulse(text).subscribe({
      next: (r) => { this.msgs.push({ role: 'assistant', content: r.answer || 'No response', ts: new Date() }); this.loading = false; this.scroll(); },
      error: () => { this.msgs.push({ role: 'assistant', content: 'Something went wrong. Try again.', ts: new Date() }); this.loading = false; }
    });
  }

  fmt(t: string): string {
    return t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>').replace(/`(.*?)`/g, '<code style="background:var(--bg-secondary);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>');
  }

  private scroll() { setTimeout(() => { const el = document.querySelector('.chat-panel__messages'); if (el) el.scrollTop = el.scrollHeight; }, 50); }
}
