import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-sidebar.component.html',
  styleUrl: './chat-sidebar.component.css'
})
export class ChatSidebarComponent {
  @Input() conversaciones: any[] = [];
  @Input() tipoSeleccionado: string = 'Lead';
  @Input() conversacionActiva: any = null;
  @Input() filtro: string = '';

  @Output() tipoCambiado = new EventEmitter<any>();
  @Output() conversacionSeleccionada = new EventEmitter<any>();
  @Output() filtroCambiado = new EventEmitter<string>();
  @Output() themeToggled = new EventEmitter<void>();

  toggleTheme() {
    this.themeToggled.emit();
  }

  onFiltroChange(val: string) {
    this.filtroCambiado.emit(val);
  }

  getNombreContacto(conv: any): string {
    if (!conv.contacto) return 'Desconocido';
    if (conv.ultimoMensaje.contactType === 'Lead') {
      return conv.contacto.nombre || 'Prospecto';
    } else {
      return `${conv.contacto.nombre || ''} ${conv.contacto.apeP || ''}`.trim();
    }
  }

  getUltimaVez(date: any) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
