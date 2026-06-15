import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="message-bubble" [class.sent]="isSent" [class.received]="!isSent">
      <div class="bubble-content">
        <img *ngIf="message.mediaUrl" [src]="message.mediaUrl" class="message-media" />
        <p>{{ message.body }}</p>
        <div class="msg-footer">
          <span class="msg-time">{{ formatTime(message.timestamp) }}</span>
          <i *ngIf="isSent" class="fas" 
             [class.fa-check]="message.status === 'sent'"
             [class.fa-check-double]="message.status === 'delivered' || message.status === 'read'"
             [class.read]="message.status === 'read'"></i>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    
    .message-bubble {
      max-width: 70%;
      animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .message-media {
      width: 100%;
      border-radius: 12px;
      margin-bottom: 10px;
      display: block;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .bubble-content {
      padding: 12px 18px;
      border-radius: 20px;
      font-size: 15px;
      line-height: 1.6;
      font-weight: 500;
      position: relative;
    }

    .sent { align-self: flex-end; }
    .sent .bubble-content {
      background: #C5A028; 
      color: white;
      border-bottom-right-radius: 4px;
      box-shadow: 0 8px 20px rgba(197, 160, 40, 0.15);
    }

    .received { align-self: flex-start; }
    .received .bubble-content {
      background: white;
      color: #1a1c1e;
      border-bottom-left-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
    }

    .msg-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 6px;
    }

    .msg-time {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.7;
    }

    .msg-footer i {
      font-size: 10px;
      opacity: 0.7;
    }

    .msg-footer i.read {
      color: #38bdf8; /* Blue for read */
      opacity: 1;
    }

    .sent .msg-time { color: white; }
    .sent .msg-footer i { color: white; }
  `]
})
export class ChatMessageComponent {
  @Input() message: any;
  @Input() isSent: boolean = false;

  formatTime(date: any) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
