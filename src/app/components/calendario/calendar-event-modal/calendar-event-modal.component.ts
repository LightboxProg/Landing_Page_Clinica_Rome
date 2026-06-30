import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar-event-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="event-modal-overlay" (click)="closeModal()">
      <div class="event-modal-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>{{ event?.pacienteNombre }}</h3>
          <button class="close-btn" (click)="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </header>
        
        <div class="modal-content">
          <div class="info-row">
            <i class="fas fa-user-md icon-primary"></i>
            <div class="info-text">
              <span class="label">Médico</span>
              <span class="value">{{ event?.medicoNombre }}</span>
            </div>
          </div>
          
          <div class="info-row">
            <i class="fas fa-stethoscope icon-primary"></i>
            <div class="info-text">
              <span class="label">Servicio</span>
              <span class="value">{{ event?.servicioNombre }}</span>
            </div>
          </div>
          
          <div class="info-row">
            <i class="fas fa-notes-medical icon-primary"></i>
            <div class="info-text">
              <span class="label">Tipo</span>
              <span class="value">{{ event?.tipoCita }}</span>
            </div>
          </div>

          <div class="info-row">
            <i class="fas fa-id-card icon-primary"></i>
            <div class="info-text">
              <span class="label">Estado del Paciente</span>
              <span class="value status-badge" [class.registered]="event?.esPaciente">
                {{ event?.esPaciente ? '✅ Paciente Registrado' : '👤 Prospecto' }}
              </span>
            </div>
          </div>

          <div class="info-row">
            <i class="fas fa-phone-alt icon-primary"></i>
            <div class="info-text">
              <span class="label">Teléfono</span>
              <span class="value">{{ event?.pacienteTelefono || 'No especificado' }}</span>
            </div>
          </div>

          <div *ngIf="event?.description" class="notes-section">
            <span class="label">Notas:</span>
            <p class="notes-text">{{ event?.description }}</p>
          </div>
        </div>

        <footer class="modal-footer">
          <button *ngIf="event?.pacienteTelefono" class="action-btn wapp-btn" (click)="onOpenWhatsApp()">
            <i class="fab fa-whatsapp"></i> Enviar WhatsApp
          </button>
          <button class="action-btn calendar-btn" (click)="onOpenGoogleCalendar()">
            <i class="fab fa-google"></i> Ver en Calendar
          </button>
        </footer>
      </div>
    </div>
  `,
  styleUrl: './calendar-event-modal.component.scss'
})
export class CalendarEventModalComponent {
  @Input() isOpen: boolean = false;
  @Input() event: any = null;
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }

  onOpenWhatsApp() {
    if (this.event?.pacienteTelefono) {
      window.open(`https://wa.me/${this.event.pacienteTelefono}`, '_blank');
    }
  }

  onOpenGoogleCalendar() {
    if (this.event?.htmlLink) {
      window.open(this.event.htmlLink, '_blank');
    }
  }
}
