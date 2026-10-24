import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ErrorRegistro, SaludSistema, SistemaService } from '../../services/sistema/sistema.service';

const NOMBRES_JOB: Record<string, string> = {
  'mantenimiento-sesiones': 'Apartados, inactividad y esperas de flujos (cada minuto)',
  'recordatorio-24h': 'Recordatorio de cita 24 h antes (cada hora)',
  'recordatorio-doctores': 'Aviso al doctor 2 min antes (cada minuto)'
};

const ORIGENES: Record<string, string> = {
  http: 'Panel / API',
  bot: 'Bot',
  stripe: 'Pagos (Stripe)',
  google: 'Google Calendar',
  proceso: 'Servidor'
};

@Component({
  selector: 'app-sistema',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sistema.component.html',
  styleUrl: './sistema.component.css'
})
export class SistemaComponent implements OnInit {
  salud: SaludSistema | null = null;
  errores: ErrorRegistro[] = [];
  soloPendientes = true;
  cargando = true;
  error = '';
  abierto: string | null = null;

  constructor(private sistemaService: SistemaService) {}

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.error = '';
    forkJoin({
      salud: this.sistemaService.obtenerSalud(),
      errores: this.sistemaService.obtenerErrores(this.soloPendientes)
    }).subscribe({
      next: ({ salud, errores }) => {
        this.salud = salud;
        this.errores = errores;
        this.cargando = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'No se pudo cargar el estado del sistema.';
        this.cargando = false;
      }
    });
  }

  cambiarFiltro(pendientes: boolean) {
    this.soloPendientes = pendientes;
    this.cargar();
  }

  marcar(id: string | 'todos') {
    this.sistemaService.marcarRevisado(id).subscribe(() => this.cargar());
  }

  nombreJob(nombre: string): string {
    return NOMBRES_JOB[nombre] || nombre;
  }

  nombreOrigen(origen: string): string {
    if (origen.startsWith('job:')) return `Tarea: ${this.nombreJob(origen.slice(4))}`;
    return ORIGENES[origen] || origen;
  }

  // Un job de cada minuto que lleva más de 5 sin correr está detenido
  jobAtrasado(ultima: string | null, nombre: string): boolean {
    if (!ultima) return false;
    const limite = nombre === 'recordatorio-24h' ? 65 : 5;
    return Date.now() - new Date(ultima).getTime() > limite * 60000;
  }

  get faltantes() {
    return (this.salud?.configuracion || []).filter(c => !c.puesta);
  }

  contexto(e: ErrorRegistro): string {
    return Object.keys(e.contexto || {}).length ? JSON.stringify(e.contexto) : '';
  }
}
