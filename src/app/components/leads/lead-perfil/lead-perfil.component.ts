import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Lead, LeadsService } from '../../../services/leads/leads.service';
import { ListaNegraService } from '../../../services/lista-negra/lista-negra.service';
import { AuthService } from '../../../services/auth/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lead-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lead-perfil.component.html',
  styleUrl: './lead-perfil.component.scss'
})
export class LeadPerfilComponent {
  @Input() lead!: Lead;
  @Output() updated = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  constructor(
    private leadsService: LeadsService,
    private listaNegraService: ListaNegraService,
    private authService: AuthService
  ) {}

  cambiarEstado(nuevoEstado: string) {
    if (!this.lead._id) return;
    this.leadsService.cambiarEstado(this.lead._id, nuevoEstado).subscribe({
      next: () => {
        Swal.fire('Actualizado', `Estado cambiado a ${nuevoEstado}`, 'success');
        this.updated.emit();
      },
      error: () => Swal.fire('Error', 'No se pudo actualizar el estado', 'error')
    });
  }

  agregarAListaNegra() {
    Swal.fire({
      title: '¿Mover a Lista Negra?',
      text: 'Indica la razón del bloqueo',
      input: 'text',
      inputPlaceholder: 'Ej. Preguntón excesivo, falta de respeto...',
      showCancelButton: true,
      confirmButtonText: 'Bloquear',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const usuario = this.authService.getUsuario();
        const data = {
          leadId: this.lead._id,
          razon: result.value,
          categoria: 'Preguntón',
          nivelGravedad: 3,
          agregadoPor: usuario?.id || ''
        };

        this.listaNegraService.agregarPaciente(data as any).subscribe({
          next: () => {
            Swal.fire('Bloqueado', 'Prospecto enviado a lista negra', 'success');
            this.updated.emit();
          },
          error: () => Swal.fire('Error', 'No se pudo bloquear al prospecto', 'error')
        });
      }
    });
  }

  convertirAPaciente() {
    // Redirigir al registro de paciente con los datos del lead pre-cargados
    // O abrir un modal de registro rápido.
    Swal.fire('Info', 'Esta funcionalidad abrirá el formulario de registro con datos pre-cargados.', 'info');
  }
}
