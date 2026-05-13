import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { UserService } from '../../../services/user/user.service';
import { Paciente, PacientesService } from '../../../services/pacientes/pacientes.service';
import { SwalService } from '../../../services/swal/swal.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-modal.component.html',
  styleUrl: './user-modal.component.css'
})

export class UserModalComponent implements OnInit {
  @Input() usuario: any;
  showModal = false;
  pacientes: Paciente[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private pacientesService: PacientesService,
    private swal: SwalService
  ) { }

  ngOnInit(): void {
    this.cargarPacientes();
  }

  cargarPacientes(): void {
    // Nos suscribimos al observable que emite la lista de pacientes
    this.pacientesService.pacientes$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Paciente[]) => this.pacientes = data,
        error: () => console.error('Error cargando pacientes')
      });

    // Ejecutamos la petición HTTP (el servicio ya se suscribe internamente y actualiza pacientes$)
    this.pacientesService.obtenerPacientes();
  }

  asignarPaciente(pacienteId: string): void {
    if (!pacienteId) {
      this.swal.warning('Selecciona un paciente');
      return;
    }
    if (this.usuario.idPacientes?.includes(pacienteId)) {
      this.swal.warning('El paciente ya está asignado');
      return;
    }
    this.userService.assignPatients(this.usuario._id, [pacienteId]).subscribe({
      next: () => {
        this.swal.success('Paciente asignado correctamente');
        if (!this.usuario.idPacientes) this.usuario.idPacientes = [];
        this.usuario.idPacientes.push(pacienteId);
      },
      error: () => this.swal.error('Error al asignar paciente')
    });
  }

  closeModal(): void {
    this.showModal = false;
  }
}
