import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CitasService, CitaPayload } from '../../../services/citas/citas.service';
import { EspecialistaAgenda } from '../calendar-sidebar/calendar-sidebar.component';

type MetodoPago = 'Ninguno' | 'Efectivo' | 'Tarjeta' | 'Transferencia';

// Pacientes y servicios se comparten entre aperturas del modal; se refrescan cada 5 min
const VIGENCIA = 5 * 60 * 1000;
const cache: Record<string, { cargado: number; datos: any[] }> = {};

const normalizar = (t: string) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const pad = (n: number) => String(n).padStart(2, '0');

// Agendar desde la agenda: se abre al tocar un horario o con "Nueva cita".
// Administración y recepción eligen con quién va; un doctor o especialista
// agenda siempre en su propia agenda (el backend también lo obliga).
@Component({
  selector: 'app-nueva-cita',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-cita.component.html',
  styleUrl: './nueva-cita.component.css'
})
export class NuevaCitaComponent implements OnChanges {
  @Input() abierto = false;
  @Input() inicio: Date | null = null;
  @Input() fin: Date | null = null;
  @Input() especialistas: EspecialistaAgenda[] = [];
  // Doctor o especialista con sesión: no elige médico
  @Input() doctorFijo: string | null = null;
  @Input() doctorSugerido = '';
  @Output() cerrar = new EventEmitter<void>();
  @Output() creada = new EventEmitter<void>();

  doctorId = '';
  fecha = '';
  hora = '';
  duracion = 60;
  readonly duraciones = [15, 30, 45, 60, 90, 120, 180];

  // Paciente
  modoPersona: 'existente' | 'nueva' = 'existente';
  busqueda = '';
  pacientes: any[] = [];
  paciente: any = null;
  nuevaPersona = { nombre: '', telefono: '' };

  // Servicio
  servicios: any[] = [];
  servicioId = '';
  costo: number | null = null;

  // Anticipo
  conAnticipo = false;
  anticipo: number | null = null;
  metodoAnticipo: MetodoPago = 'Efectivo';
  readonly metodos: MetodoPago[] = ['Efectivo', 'Tarjeta', 'Transferencia'];

  notas = '';
  guardando = false;
  error = '';
  conflictos: any[] = [];

  constructor(private http: HttpClient, private citasService: CitasService) {}

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['abierto'] && this.abierto) this.preparar();
  }

  private preparar(): void {
    this.error = '';
    this.conflictos = [];
    this.guardando = false;
    this.paciente = null;
    this.busqueda = '';
    this.modoPersona = 'existente';
    this.nuevaPersona = { nombre: '', telefono: '' };
    this.servicioId = '';
    this.costo = null;
    this.conAnticipo = false;
    this.anticipo = null;
    this.notas = '';

    const inicio = this.inicio || this.proximaMediaHora();
    this.fecha = `${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-${pad(inicio.getDate())}`;
    this.hora = `${pad(inicio.getHours())}:${pad(inicio.getMinutes())}`;
    const minutos = this.fin ? Math.round((this.fin.getTime() - inicio.getTime()) / 60000) : 60;
    this.duracion = minutos >= 15 && minutos <= 480 ? minutos : 60;
    this.agregarDuracion(this.duracion);

    this.doctorId = this.doctorFijo
      || this.doctorSugerido
      || (this.especialistas.length === 1 ? this.especialistas[0].id : '');

    this.cargar('pacientes', `${environment.apiUrl}/pacientes`, d => this.pacientes = d);
    this.cargarServicios();
  }

  private agregarDuracion(minutos: number): void {
    if (this.duraciones.includes(minutos)) return;
    this.duraciones.push(minutos);
    this.duraciones.sort((a, b) => a - b);
  }

  private proximaMediaHora(): Date {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
    return d;
  }

  private cargar(clave: string, url: string, listo: (datos: any[]) => void): void {
    const c = cache[clave];
    if (c && Date.now() - c.cargado < VIGENCIA) { listo(c.datos); return; }
    this.http.get<any>(url).subscribe({
      next: (datos) => {
        const lista = Array.isArray(datos) ? datos : (datos?.servicios || datos?.data || []);
        cache[clave] = { cargado: Date.now(), datos: lista };
        listo(lista);
      },
      error: () => listo([])
    });
  }

  get especialista(): EspecialistaAgenda | undefined {
    return this.especialistas.find(e => e.id === this.doctorId);
  }

  get atencion(): 'Dental' | 'Estetica' {
    return this.especialista?.atencion || 'Estetica';
  }

  private atencionCargada: string | null = null;

  cargarServicios(): void {
    const dental = this.atencion === 'Dental';
    this.atencionCargada = this.atencion;
    this.cargar(dental ? 'servicios-dentales' : 'servicios', `${environment.apiUrl}/${dental ? 'servicios-dentales' : 'servicios'}`,
      d => this.servicios = d.filter(s => s.activo !== false).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre))));
  }

  alCambiarDoctor(): void {
    this.conflictos = [];
    // Dental y estética tienen catálogos distintos: al cambiar, el servicio elegido ya no aplica
    if (this.atencionCargada !== this.atencion) {
      this.servicioId = '';
      this.costo = null;
      this.cargarServicios();
    }
  }

  get servicio(): any {
    return this.servicios.find(s => s._id === this.servicioId) || null;
  }

  alCambiarServicio(): void {
    const s = this.servicio;
    if (!s) return;
    this.costo = s.costo ?? null;
    const minutos = Number(s.duracionMinutos);
    if (minutos > 0) {
      this.duracion = minutos;
      this.agregarDuracion(minutos);
    }
    this.conflictos = [];
  }

  // ===== Paciente =====

  get sugerencias(): any[] {
    const q = normalizar(this.busqueda);
    if (q.length < 2) return [];
    const digitos = q.replace(/\D/g, '');
    return this.pacientes
      .filter(p => {
        const nombre = normalizar(`${p.nombre} ${p.apeP} ${p.apeM || ''} ${p.apodo || ''}`);
        const tel = `${p.telefonoWhatsapp || ''} ${p.telefonoPaciente || ''}`;
        return q.split(/\s+/).every(parte => nombre.includes(parte)) || (digitos.length >= 3 && tel.includes(digitos));
      })
      .slice(0, 6);
  }

  elegirPaciente(p: any): void {
    this.paciente = p;
    this.busqueda = '';
  }

  // Si lo que escribió no existe, pasa directo a "persona nueva" con el dato puesto
  usarComoNueva(): void {
    const texto = this.busqueda.trim();
    const digitos = texto.replace(/\D/g, '');
    this.modoPersona = 'nueva';
    this.nuevaPersona = digitos.length >= 7 ? { nombre: '', telefono: digitos.slice(-10) } : { nombre: texto, telefono: '' };
    this.busqueda = '';
  }

  nombreDe(p: any): string {
    return `${p.nombre} ${p.apeP} ${p.apeM || ''}`.trim();
  }

  telefonoDe(p: any): string {
    return String(p.telefonoWhatsapp || p.telefonoPaciente || '');
  }

  // ===== Resumen =====

  get inicioCita(): Date | null {
    if (!this.fecha || !this.hora) return null;
    const d = new Date(`${this.fecha}T${this.hora}:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  get finCita(): Date | null {
    const i = this.inicioCita;
    return i ? new Date(i.getTime() + this.duracion * 60000) : null;
  }

  get fechaLegible(): string {
    return this.inicioCita?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) || '';
  }

  get enElPasado(): boolean {
    const i = this.inicioCita;
    return !!i && i.getTime() < Date.now() - 5 * 60000;
  }

  etiquetaDuracion(m: number): string {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    return r ? `${h} h ${r} min` : `${h} h`;
  }

  // ===== Guardar =====

  private validar(): string {
    if (!this.doctorId) return 'Elige con quién va la cita.';
    if (this.modoPersona === 'existente' && !this.paciente) return 'Busca y elige al paciente, o registra una persona nueva.';
    if (this.modoPersona === 'nueva') {
      if (!this.nuevaPersona.nombre.trim()) return 'Escribe el nombre de la persona.';
      if (this.nuevaPersona.telefono.replace(/\D/g, '').length !== 10) return 'El teléfono debe tener 10 dígitos (sirve para confirmarle por WhatsApp).';
    }
    if (!this.servicioId) return 'Elige el tratamiento.';
    if (!this.inicioCita) return 'Revisa la fecha y la hora.';
    const anticipo = Number(this.anticipo) || 0;
    if (this.conAnticipo && anticipo <= 0) return 'Escribe el monto del anticipo o quita la casilla.';
    if (this.conAnticipo && this.costo != null && anticipo > Number(this.costo)) return 'El anticipo no puede ser mayor al costo.';
    return '';
  }

  guardar(forzar = false): void {
    this.error = this.validar();
    if (this.error) return;

    const p = this.paciente;
    const nueva = this.modoPersona === 'nueva';
    const anticipo = this.conAnticipo ? Number(this.anticipo) || 0 : 0;
    const payload: CitaPayload = {
      pacienteId: !nueva ? p._id : undefined,
      pacienteNombre: nueva ? this.nuevaPersona.nombre.trim() : this.nombreDe(p),
      pacienteTelefono: nueva ? this.nuevaPersona.telefono.replace(/\D/g, '') : this.telefonoDe(p),
      pacienteEmail: !nueva ? p.correoElectronico : undefined,
      doctorId: this.doctorId,
      servicioId: this.servicioId,
      tipoCita: this.atencion,
      titulo: this.servicio?.nombre || '',
      fechaHoraInicio: this.inicioCita!,
      fechaHoraFin: this.finCita!,
      notas: this.notas.trim() || undefined,
      costoTotal: this.costo != null ? Number(this.costo) : undefined,
      montoAnticipo: anticipo,
      anticipoMetodoPago: anticipo > 0 ? this.metodoAnticipo : 'Ninguno',
      origen: 'Panel',
      forzar
    };

    this.guardando = true;
    this.error = '';
    this.citasService.agendarCita(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.creada.emit();
      },
      error: (err) => {
        this.guardando = false;
        if (err.status === 409 && err.error?.conflictos) {
          this.conflictos = err.error.conflictos;
          return;
        }
        this.error = err.error?.message || 'No se pudo agendar la cita.';
      }
    });
  }

  descripcionConflicto(c: any): string {
    const h = (f: any) => new Date(f).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
    return c.tipo === 'apartado'
      ? `${h(c.inicio)}–${h(c.fin)}: alguien está pagando ese horario en línea`
      : `${h(c.inicio)}–${h(c.fin)}: ${c.paciente || 'otra cita'}${c.titulo ? ` (${c.titulo})` : ''}`;
  }
}
