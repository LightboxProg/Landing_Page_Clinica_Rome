import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chat-message.component.html',
  styleUrl: './chat-message.component.css'
})
export class ChatMessageComponent {
  @Input() message: any;
  @Input() isSent: boolean = false;

  formatTime(date: any) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Texto de la palomita para el tooltip y los lectores de pantalla
  get descripcionEstado(): string {
    const m = this.message || {};
    switch (m.status) {
      case 'pending': return 'Enviando';
      case 'sent': return 'Enviado';
      case 'delivered': return m.fechaEntrega ? `Entregado · ${this.formatTime(m.fechaEntrega)}` : 'Entregado';
      case 'read': return m.fechaLectura ? `Leído · ${this.formatTime(m.fechaLectura)}` : 'Leído';
      case 'failed': return 'No entregado';
      default: return '';
    }
  }
}
