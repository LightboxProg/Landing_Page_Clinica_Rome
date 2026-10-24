import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EspecialistaAgenda {
  id: string;
  nombre: string;
  tipo?: string;
  atencion: 'Dental' | 'Estetica';
  color: string;
}

export interface CitaDelDia {
  id: string;
  inicio: Date;
  fin: Date;
  paciente: string;
  servicio: string;
  medico?: string;
  color: string;
  cobrado: boolean;
  datos: any;
}

// Panel lateral de la agenda: lo de hoy (siempre visible) y el filtro por especialista
@Component({
  selector: 'app-calendar-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-sidebar.component.html',
  styleUrl: './calendar-sidebar.component.css'
})
export class CalendarSidebarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() especialistas: EspecialistaAgenda[] = [];
  @Input() doctorIdSeleccionado = '';
  @Input() mostrarFiltro = true;
  @Input() citasHoy: CitaDelDia[] = [];
  @Input() cargando = false;
  @Output() doctorIdSeleccionadoChange = new EventEmitter<string>();
  @Input() rangoVisible: { inicio: Date; fin: Date } | null = null;
  @Output() citaSeleccionada = new EventEmitter<any>();
  @Output() irAFecha = new EventEmitter<Date>();

  // Mini calendario
  mesMostrado = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  semanas: Date[][] = [];
  readonly diasSemana = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  ahora = new Date();
  // El locale es de Angular no está registrado; Intl ya trae español
  readonly diaHoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' });
  readonly mesHoy = new Date().toLocaleDateString('es-MX', { month: 'long' });
  private reloj?: ReturnType<typeof setInterval>;

  ngOnChanges(cambios: SimpleChanges): void {
    // El mini calendario sigue a la agenda cuando ésta se mueve a otro mes
    if (cambios['rangoVisible'] && this.rangoVisible) {
      const ref = this.rangoVisible.inicio;
      const mes = new Date(ref.getFullYear(), ref.getMonth(), 1);
      if (mes.getTime() !== this.mesMostrado.getTime()) {
        this.mesMostrado = mes;
        this.armarMes();
      }
    }
  }

  get tituloMes(): string {
    return this.mesMostrado.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }

  moverMes(delta: number): void {
    this.mesMostrado = new Date(this.mesMostrado.getFullYear(), this.mesMostrado.getMonth() + delta, 1);
    this.armarMes();
  }

  private armarMes(): void {
    const primero = this.mesMostrado;
    const desfase = (primero.getDay() + 6) % 7; // semana empieza en lunes
    const inicio = new Date(primero.getFullYear(), primero.getMonth(), 1 - desfase);
    this.semanas = Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + w * 7 + d)));
  }

  esHoy(d: Date): boolean {
    return d.toDateString() === this.ahora.toDateString();
  }

  fueraDeMes(d: Date): boolean {
    return d.getMonth() !== this.mesMostrado.getMonth();
  }

  enRango(d: Date): boolean {
    return !!this.rangoVisible && d >= this.rangoVisible.inicio && d < this.rangoVisible.fin;
  }

  ngOnInit(): void {
    this.armarMes();
    // "En 25 min" y lo ya pasado se actualizan solos
    this.reloj = setInterval(() => this.ahora = new Date(), 60_000);
  }

  ngOnDestroy(): void {
    clearInterval(this.reloj);
  }

  elegir(id: string): void {
    if (id === this.doctorIdSeleccionado) return;
    this.doctorIdSeleccionadoChange.emit(id);
  }

  get siguiente(): CitaDelDia | null {
    return this.citasHoy.find(c => c.fin > this.ahora) || null;
  }

  get porCobrar(): number {
    return this.citasHoy.filter(c => !c.cobrado && c.inicio <= this.ahora).length;
  }

  get variosMedicos(): boolean {
    return new Set(this.citasHoy.map(c => c.medico)).size > 1;
  }

  yaPaso(c: CitaDelDia): boolean {
    return c.fin <= this.ahora;
  }

  cuando(c: CitaDelDia): string {
    if (c.inicio <= this.ahora) return 'En curso';
    const min = Math.round((c.inicio.getTime() - this.ahora.getTime()) / 60000);
    if (min < 60) return `En ${min} min`;
    const h = Math.floor(min / 60);
    const resto = min % 60;
    return resto ? `En ${h} h ${resto} min` : `En ${h} h`;
  }
}
