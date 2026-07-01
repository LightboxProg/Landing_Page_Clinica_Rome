import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user/user.service';
import Swal from 'sweetalert2';

interface Turno {
  horaInicio: string;
  horaFin: string;
}

interface DiaLaboral {
  diaSemana: number;
  activo: boolean;
  turnos: Turno[];
}

interface Feriado {
  fecha: string;
  nombre: string;
}

@Component({
  selector: 'app-horario-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horario-doctor.component.html',
  styleUrl: './horario-doctor.component.css'
})
export class HorarioDoctorComponent implements OnInit {
  @Input() doctorId!: string;

  dias = [
    { id: 1, nombre: 'Lunes', abrev: 'LUN' },
    { id: 2, nombre: 'Martes', abrev: 'MAR' },
    { id: 3, nombre: 'Miercoles', abrev: 'MIE' },
    { id: 4, nombre: 'Jueves', abrev: 'JUE' },
    { id: 5, nombre: 'Viernes', abrev: 'VIE' },
    { id: 6, nombre: 'Sabado', abrev: 'SAB' },
    { id: 0, nombre: 'Domingo', abrev: 'DOM' }
  ];

  diasLaborales: DiaLaboral[] = [];
  trabajaFeriados: boolean = false;
  aplicarMismoHorario: boolean = true;
  turnosGlobales: Turno[] = [{ horaInicio: '09:00', horaFin: '15:00' }];

  // Feriados del año actual y siguiente
  feriadosAnioActual: Feriado[] = [];
  feriadosAnioSiguiente: Feriado[] = [];
  anioActual: number = new Date().getFullYear();

  guardando: boolean = false;

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.inicializarDias();
    this.cargarFeriados();
    if (this.doctorId) {
      this.cargarHorario();
    }
  }

  // Estructura inicial de dias
  inicializarDias() {
    this.diasLaborales = this.dias.map(d => ({
      diaSemana: d.id,
      activo: d.id >= 1 && d.id <= 5,
      turnos: [{ horaInicio: '09:00', horaFin: '15:00' }]
    }));
  }

  // Carga feriados del backend
  cargarFeriados() {
    this.userService.obtenerFeriados(this.anioActual).subscribe(data => {
      this.feriadosAnioActual = data || [];
    });
    this.userService.obtenerFeriados(this.anioActual + 1).subscribe(data => {
      this.feriadosAnioSiguiente = data || [];
    });
  }

  get todosFeriados(): Feriado[] {
    return [...this.feriadosAnioActual, ...this.feriadosAnioSiguiente];
  }

  // Carga el horario guardado del doctor
  cargarHorario() {
    this.userService.obtenerHorarioDoctor(this.doctorId).subscribe(horario => {
      if (!horario) return;

      this.trabajaFeriados = horario.trabajaFeriados || false;

      if (horario.diasLaborales && horario.diasLaborales.length > 0) {
        for (const dl of horario.diasLaborales) {
          const idx = this.diasLaborales.findIndex(d => d.diaSemana === dl.diaSemana);
          if (idx !== -1) {
            this.diasLaborales[idx] = {
              ...dl,
              turnos: dl.turnos && dl.turnos.length > 0
                ? JSON.parse(JSON.stringify(dl.turnos))
                : [{ horaInicio: '09:00', horaFin: '15:00' }]
            };
          }
        }
        this.detectarMismoHorario();
      }
    });
  }

  // Detecta si todos los dias activos comparten el mismo horario
  detectarMismoHorario() {
    const activos = this.diasLaborales.filter(d => d.activo);
    if (activos.length === 0) {
      this.aplicarMismoHorario = true;
      return;
    }
    const ref = JSON.stringify(activos[0].turnos);
    this.aplicarMismoHorario = activos.every(d => JSON.stringify(d.turnos) === ref);
    if (this.aplicarMismoHorario) {
      this.turnosGlobales = JSON.parse(ref);
    }
  }

  getDiaConfig(diaId: number): DiaLaboral {
    return this.diasLaborales.find(d => d.diaSemana === diaId) || { diaSemana: diaId, activo: false, turnos: [] };
  }

  toggleDia(diaId: number) {
    const dia = this.diasLaborales.find(d => d.diaSemana === diaId);
    if (!dia) return;
    dia.activo = !dia.activo;
    if (dia.activo && this.aplicarMismoHorario) {
      dia.turnos = JSON.parse(JSON.stringify(this.turnosGlobales));
    }
  }

  // Turnos globales
  agregarTurnoGlobal() {
    this.turnosGlobales.push({ horaInicio: '14:00', horaFin: '20:00' });
    this.aplicarHorarioGlobal();
  }

  removerTurnoGlobal(index: number) {
    this.turnosGlobales.splice(index, 1);
    this.aplicarHorarioGlobal();
  }

  actualizarTurnoGlobal(index: number, campo: 'horaInicio' | 'horaFin', valor: string) {
    this.turnosGlobales[index][campo] = valor;
    this.aplicarHorarioGlobal();
  }

  aplicarHorarioGlobal() {
    this.diasLaborales.forEach(d => {
      if (d.activo) {
        d.turnos = JSON.parse(JSON.stringify(this.turnosGlobales));
      }
    });
  }

  // Turnos por dia individual
  agregarTurnoDia(diaId: number) {
    const dia = this.diasLaborales.find(d => d.diaSemana === diaId);
    if (!dia) return;
    dia.turnos.push({ horaInicio: '14:00', horaFin: '20:00' });
  }

  removerTurnoDia(diaId: number, index: number) {
    const dia = this.diasLaborales.find(d => d.diaSemana === diaId);
    if (!dia) return;
    dia.turnos.splice(index, 1);
  }

  get diasActivosCount(): number {
    return this.diasLaborales.filter(d => d.activo).length;
  }

  // Guardar horario
  guardarHorario() {
    if (this.diasActivosCount === 0) {
      Swal.fire('Sin dias activos', 'Activa al menos un dia de la semana.', 'warning');
      return;
    }

    this.guardando = true;
    const payload = {
      doctorId: this.doctorId,
      diasLaborales: this.diasLaborales,
      trabajaFeriados: this.trabajaFeriados
    };

    this.userService.guardarHorarioDoctor(payload).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Horario guardado', showConfirmButton: false, timer: 2000 });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('Error', err.error?.message || 'Error al guardar el horario.', 'error');
      }
    });
  }
}
