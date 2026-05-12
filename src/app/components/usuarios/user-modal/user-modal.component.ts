import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { UserService } from '../../../services/user/user.service';
import { PacientesService } from '../../../services/pacientes/pacientes.service';
import { SwalService } from '../../../services/swal/swal.service';

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
  pacientes: any[] = [];

  constructor(
    private userService: UserService,
    private pacientesService: PacientesService,
    private swal: SwalService
  ) { }

  ngOnInit(): void {
    this.cargarPacientes();
  }

  cargarPacientes(): void {
    this.pacientesService.obtenerPacientes().subscribe({
      next: (data) => this.pacientes = data,
      error: () => console.error('Error cargando pacientes')
    });
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
