import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'pulse-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fade-in" style="display:flex;flex-direction:column;height:calc(100vh - var(--topbar-height) - 64px)">
      <div class="page-header" style="flex-shrink:0">
        <h1 class="page-header__title">
          <span class="material-symbols-outlined" style="font-size:24px;vertical-align:middle;margin-right:8px;color:var(--accent)">smart_toy</span>
          Pulse AI Assistant
        </h1>
        <p class="page-header__desc">Ask questions about your analytics data. Powered by Azure OpenAI.</p>
      </div>

      <!-- Suggested Questions -->
      <div class="suggestions" *ngIf="messages.length === 0" style="flex-shrink:0">
        <div class="suggestion-chip" *ngFor="let q of suggestions" (click)="askQuestion(q)">{{ q }}</div>
      </div>

      <!-- Chat Messages -->
      <div class="chat-messages" #chatContainer>
        <div *ngFor="let msg of messages" class="chat-msg" [class.chat-msg--user]="msg.role === 'user'" [class.chat-msg--ai]="msg.role === 'assistant'">
          <div class="chat-msg__avatar">
            <span class="material-symbols-outlined" *ngIf="msg.role === 'assistant'" style="font-size:18px;color:var(--accent)">smart_toy</span>
            <span class="material-symbols-outlined" *ngIf="msg.role === 'user'" style="font-size:18px;color:var(--text-secondary)">person</span>
          </div>
          <div class="chat-msg__body">
            <div class="chat-msg__name">{{ msg.role === 'user' ? 'You' : 'Pulse AI' }}</div>
            <div class="chat-msg__text" [innerHTML]="formatMessage(msg.content)"></div>
            <div class="chat-msg__time">{{ msg.timestamp | date:'HH:mm' }}</div>
          </div>
        </div>

        <div *ngIf="loading" class="chat-msg chat-msg--ai">
          <div class="chat-msg__avatar">
            <span class="material-symbols-outlined" style="font-size:18px;color:var(--accent)">smart_toy</span>
          </div>
          <div class="chat-msg__body">
            <div class="chat-msg__name">Pulse AI</div>
            <div class="chat-msg__text typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input-bar">
        <input type="text" class="chat-input" [(ngModel)]="question"
          placeholder="Ask about your analytics data..."
          (keyup.enter)="send()" [disabled]="loading" />
        <button class="chat-send-btn" (click)="send()" [disabled]="loading || !question.trim()">
          <span class="material-symbols-outlined" style="font-size:20px">send</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .suggestion-chip {
      padding: 8px 16px; border-radius: 999px; border: 1px solid var(--border);
      background: var(--bg-primary); color: var(--text-secondary); font-size: 12px;
      cursor: pointer; transition: all 0.15s; font-family: var(--font-sans);
    }
    .suggestion-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }

    .chat-messages { flex: 1; overflow-y: auto; padding: 8px 0; display: flex; flex-direction: column; gap: 16px; }

    .chat-msg { display: flex; gap: 12px; max-width: 85%; animation: fadeIn 0.2s ease; }
    .chat-msg--user { align-self: flex-end; flex-direction: row-reverse; }
    .chat-msg--ai { align-self: flex-start; }

    .chat-msg__avatar {
      width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; background: var(--bg-secondary); border: 1px solid var(--border);
    }
    .chat-msg--user .chat-msg__avatar { background: var(--accent-soft); }

    .chat-msg__body {
      padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border);
      background: var(--bg-primary); box-shadow: var(--shadow-sm);
    }
    .chat-msg--user .chat-msg__body { background: var(--accent-soft); border-color: var(--border-accent); }

    .chat-msg__name { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
    .chat-msg__text { font-size: 13px; line-height: 1.7; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; }
    .chat-msg__time { font-size: 10px; color: var(--text-muted); margin-top: 6px; }

    .chat-input-bar {
      display: flex; gap: 8px; padding-top: 16px; border-top: 1px solid var(--border);
      margin-top: 8px; flex-shrink: 0;
    }
    .chat-input {
      flex: 1; padding: 12px 16px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-sans);
      font-size: 13px; outline: none; transition: border-color 0.15s;
    }
    .chat-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
    .chat-input:disabled { opacity: 0.6; }

    .chat-send-btn {
      width: 44px; height: 44px; border-radius: 10px; border: none;
      background: var(--accent); color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s; flex-shrink: 0;
    }
    .chat-send-btn:hover:not(:disabled) { background: var(--accent-hover); }
    .chat-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .typing-indicator { display: flex; gap: 4px; padding: 4px 0; }
    .typing-indicator span {
      width: 6px; height: 6px; border-radius: 50%; background: var(--accent);
      animation: typingBounce 1.2s ease-in-out infinite;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AiChatComponent {
  question = '';
  loading = false;
  messages: ChatMessage[] = [];

  suggestions = [
    'Which page do users spend the most time on?',
    'What is the error rate today?',
    'How many users are active this week?',
    'Which API calls are the slowest?',
    'What are the most common navigation paths?',
    'Give me a summary of today\'s activity'
  ];

  constructor(private api: ApiService) {}

  askQuestion(q: string) {
    this.question = q;
    this.send();
  }

  send() {
    const q = this.question.trim();
    if (!q || this.loading) return;

    this.messages.push({ role: 'user', content: q, timestamp: new Date() });
    this.question = '';
    this.loading = true;

    setTimeout(() => {
      const el = document.querySelector('.chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);

    this.api.askPulse(q).subscribe({
      next: (res) => {
        this.messages.push({ role: 'assistant', content: res.answer || 'No response', timestamp: new Date() });
        this.loading = false;
        setTimeout(() => {
          const el = document.querySelector('.chat-messages');
          if (el) el.scrollTop = el.scrollHeight;
        }, 50);
      },
      error: (err) => {
        this.messages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date() });
        this.loading = false;
      }
    });
  }

  formatMessage(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/`(.*?)`/g, '<code style="background:var(--bg-secondary);padding:1px 6px;border-radius:4px;font-size:12px">$1</code>');
  }
}
