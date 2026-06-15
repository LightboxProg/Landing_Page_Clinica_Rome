import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, Usuario } from '../../../services/user/user.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-horario-atencion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horario-atencion.component.html',
  styleUrl: './horario-atencion.component.css'
})
export class HorarioAtencionComponent implements OnInit {
  @Input() doctorId!: string;
  
  dias = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    { id: 0, nombre: 'Domingo' }
  ];

  horarios: any[] = [];

  constructor(private userService: UserService) {}

  ngOnInit() {
    if (this.doctorId) {
      this.cargarHorarios();
    }
  }

  cargarHorarios() {
    this.userService.getHorariosDoctor(this.doctorId).subscribe(data => {
      this.horarios = data;
    });
  }

  getHorarioDia(diaId: number) {
    return this.horarios.find(h => h.diaSemana === diaId) || { diaSemana: diaId, horaInicio: '09:00', horaFin: '18:00', activo: false };
  }

  guardar(diaId: number, horaInicio: string, horaFin: string, activo: boolean) {
    const payload = {
      doctorId: this.doctorId,
      diaSemana: diaId,
      horaInicio,
      horaFin,
      activo
    };

    this.userService.guardarHorario(payload).subscribe(() => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Horario actualizado',
        showConfirmButton: false,
        timer: 1500
      });
      this.cargarHorarios();
    });
  }
}
