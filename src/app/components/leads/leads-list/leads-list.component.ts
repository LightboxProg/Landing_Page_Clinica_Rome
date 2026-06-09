import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Lead } from '../../../services/leads/leads.service';

@Component({
  selector: 'app-leads-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './leads-list.component.html',
  styleUrl: './leads-list.component.scss'
})
export class LeadsListComponent {
  @Input() leads: Lead[] = [];
  @Output() selectLead = new EventEmitter<Lead>();

  selectedId: string | undefined = '';

  onSelect(lead: Lead) {
    this.selectedId = lead._id;
    this.selectLead.emit(lead);
  }

  getBadgeClass(estado: string) {
    switch (estado) {
      case 'Nuevo': return 'badge-nuevo';
      case 'Atendido': return 'badge-atendido';
      case 'Preguntón': return 'badge-pregunton';
      case 'Convertido': return 'badge-convertido';
      case 'Lista Negra': return 'badge-lista-negra';
      default: return '';
    }
  }

  getIcon(origen: string) {
    switch (origen) {
      case 'WhatsApp': return 'fab fa-whatsapp';
      case 'Instagram': return 'fab fa-instagram';
      case 'Facebook': return 'fab fa-facebook-messenger';
      default: return 'fas fa-globe';
    }
  }
}
