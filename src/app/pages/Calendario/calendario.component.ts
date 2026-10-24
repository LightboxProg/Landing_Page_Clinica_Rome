import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, DateSelectArg, DatesSetArg, EventContentArg, EventInput } from '@fullcalendar/core';
import Swal from 'sweetalert2';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { CalendarService } from '../../services/calendar/calendar.service';
import { CitasService } from '../../services/citas/citas.service';
import { UserService, Usuario } from '../../services/user/user.service';
import { AuthService } from '../../services/auth/auth.service';
import { CalendarSidebarComponent, CitaDelDia, EspecialistaAgenda } from '../../components/calendario/calendar-sidebar/calendar-sidebar.component';
import { CalendarEventModalComponent } from '../../components/calendario/calendar-event-modal/calendar-event-modal.component';
import { NuevaCitaComponent } from '../../components/calendario/nueva-cita/nueva-cita.component';
import { SwalService } from '../../services/swal/swal.service';

type Vista = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'listWeek';

// Si dos especialistas comparten color (o no tienen), la agenda no sirve para
// distinguirlos: se toma uno de esta paleta, legible en claro y en oscuro.
const PALETA = ['#3b82f6', '#c2a85a', '#14b8a6', '#e05d8f', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444'];

@Component({
  selector: 'app-calendario-admin',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, CalendarSidebarComponent, CalendarEventModalComponent, NuevaCitaComponent],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.css'
})
export class CalendarioAdminComponent implements OnInit {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  doctores: Usuario[] = [];
  especialistas: EspecialistaAgenda[] = [];
  doctorIdSeleccionado = '';
  isDoctorOrSpecialist = false;

  titulo = '';
  vista: Vista = 'timeGridWeek';
  readonly vistas: { valor: Vista; etiqueta: string }[] = [
    { valor: 'dayGridMonth', etiqueta: 'Mes' },
    { valor: 'timeGridWeek', etiqueta: 'Semana' },
    { valor: 'timeGridDay', etiqueta: 'Día' },
    { valor: 'listWeek', etiqueta: 'Lista' }
  ];

  citasHoy: CitaDelDia[] = [];
  totalEnRango = 0;
  rangoVisible: { inicio: Date; fin: Date } | null = null;
  cargandoHoy = true;
  cargando = false;

  // Nueva cita
  nuevaAbierta = false;
  nuevaInicio: Date | null = null;
  nuevaFin: Date | null = null;

  // Custom Modal State
  isModalOpen = false;
  selectedEvent: any = null;

  private colores = new Map<string, string>();
  private rango: { inicio: string; fin: string } | null = null;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: this.vistaInicial(),
    locale: esLocale,
    // La barra la dibuja la página: la de FullCalendar se partía en dos renglones
    headerToolbar: false,
    // Ocupa el alto de su contenedor; la hoja de estilos fija ese alto
    height: '100%',
    firstDay: 1,
    slotMinTime: '08:00:00',
    slotMaxTime: '21:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00',
    slotLabelFormat: { hour: 'numeric', minute: '2-digit', hour12: false },
    eventTimeFormat: { hour: 'numeric', minute: '2-digit', hour12: false },
    dayHeaderContent: (arg) => this.encabezadoDia(arg),
    scrollTime: this.horaParaScroll(),
    scrollTimeReset: false,
    allDaySlot: false,
    nowIndicator: true,
    handleWindowResize: true,
    expandRows: false,
    slotEventOverlap: false,
    // Arrastrar mueve la cita y estirarla cambia su duración (siempre se confirma antes)
    editable: true,
    eventDrop: (info) => this.alMover(info),
    eventResize: (info) => this.alMover(info),
    // Tocar o arrastrar sobre un horario abre "Nueva cita" con esa hora
    selectable: true,
    selectMirror: true,
    unselectAuto: true,
    select: (arg) => this.alSeleccionar(arg),
    dayMaxEvents: 3,
    noEventsContent: 'Sin citas en este periodo',
    eventContent: (arg) => this.contenidoEvento(arg),
    eventClick: this.handleEventClick.bind(this),
    datesSet: this.handleDatesSet.bind(this)
  };

  constructor(
    private calendarService: CalendarService,
    private userService: UserService,
    private authService: AuthService,
    private swal: SwalService,
    private citasService: CitasService
  ) {}

  ngOnInit() {
    this.vista = this.vistaInicial();
    this.checkRole();
    this.cargarHoy();
  }

  // En el celular una semana de 7 columnas no se lee: se abre en lista
  private vistaInicial(): Vista {
    return window.innerWidth < 768 ? 'listWeek' : 'timeGridWeek';
  }

  private horaParaScroll(): string {
    const h = Math.max(8, Math.min(18, new Date().getHours() - 1));
    return `${String(h).padStart(2, '0')}:00:00`;
  }

  checkRole() {
    const user = this.authService.getUsuario();
    if (user?.tipo === 'Doctor' || user?.tipo === 'Especialista') {
      this.isDoctorOrSpecialist = true;
      this.doctorIdSeleccionado = user.id;
      // Los doctores solo se cargan a si mismos en el array para el sidebar
      this.doctores = [{ ...(user as any), _id: user.id }];
      this.asignarColores();
    } else {
      this.cargarDoctores();
    }
  }

  cargarDoctores() {
    this.userService.getUsuarios().subscribe(users => {
      this.doctores = users.filter(u => u.tipo === 'Doctor' || u.tipo === 'Especialista');
      this.asignarColores();
      if (this.rango) this.cargarEventos(this.rango.inicio, this.rango.fin);
    });
  }

  private asignarColores(): void {
    const usados = new Set<string>();
    this.colores.clear();
    this.doctores.forEach((d, i) => {
      const propio = (d.colorCalendario || '').toLowerCase();
      const color = propio && !usados.has(propio) ? propio : PALETA.find(c => !usados.has(c)) || PALETA[i % PALETA.length];
      usados.add(color);
      this.colores.set(String(d._id), color);
    });
    this.especialistas = this.doctores.map(d => ({
      id: String(d._id),
      nombre: `${d.nombre} ${d.apeP}`,
      tipo: d.tipo,
      atencion: (d.atencion || (d.tipo === 'Doctor' ? 'Dental' : 'Estetica')) as 'Dental' | 'Estetica',
      color: this.colores.get(String(d._id))!
    }));
  }

  colorDe(medicoId: any, respaldo?: string): string {
    return this.colores.get(String(medicoId)) || respaldo || PALETA[0];
  }

  // ===== Barra superior =====

  private get api() {
    return this.calendarComponent?.getApi();
  }

  hoy(): void { this.api?.today(); }
  anterior(): void { this.api?.prev(); }
  siguiente(): void { this.api?.next(); }

  irAFecha(fecha: Date): void {
    this.api?.gotoDate(fecha);
    // En vista de mes, elegir un día abre ese día
    if (this.vista === 'dayGridMonth') this.cambiarVista('timeGridDay');
  }

  // Atajos: T hoy, ← → moverse, M S D L vistas (no cuando se escribe en un campo o hay un modal)
  @HostListener('document:keydown', ['$event'])
  atajos(event: KeyboardEvent): void {
    const objetivo = event.target as HTMLElement;
    if (this.isModalOpen || this.nuevaAbierta || event.metaKey || event.ctrlKey || event.altKey) return;
    if (objetivo.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    const mapa: Record<string, () => void> = {
      t: () => this.hoy(),
      n: () => this.nuevaCita(),
      arrowleft: () => this.anterior(),
      arrowright: () => this.siguiente(),
      m: () => this.cambiarVista('dayGridMonth'),
      s: () => this.cambiarVista('timeGridWeek'),
      d: () => this.cambiarVista('timeGridDay'),
      l: () => this.cambiarVista('listWeek')
    };
    const accion = mapa[event.key.toLowerCase()];
    if (accion) { event.preventDefault(); accion(); }
  }

  get periodoVacio(): string | null {
    if (this.cargando || this.totalEnRango > 0 || this.vista === 'listWeek') return null;
    return ({ dayGridMonth: 'Sin citas este mes', timeGridWeek: 'Sin citas esta semana', timeGridDay: 'Sin citas este día' } as Record<string, string>)[this.vista] || null;
  }

  cambiarVista(vista: Vista): void {
    this.vista = vista;
    this.api?.changeView(vista);
  }

  onDoctorChange(id?: string) {
    if (id !== undefined) this.doctorIdSeleccionado = id;
    if (this.rango) this.cargarEventos(this.rango.inicio, this.rango.fin);
    this.cargarHoy();
  }

  // FullCalendar avisa a media renderización: el título y el rango se aplican en
  // el siguiente ciclo para no cambiar valores ya revisados por Angular
  handleDatesSet(arg: DatesSetArg) {
    setTimeout(() => {
      this.titulo = arg.view.title;
      this.vista = arg.view.type as Vista;
      this.rango = { inicio: arg.startStr, fin: arg.endStr };
      // Para el mini calendario: el periodo que realmente se ve (en mes, sin los días de relleno)
      this.rangoVisible = { inicio: arg.view.currentStart, fin: arg.view.currentEnd };
      this.cargarEventos(arg.startStr, arg.endStr);
    });
  }

  // ===== Eventos =====

  private aEvento(e: any): EventInput {
    const color = this.colorDe(e.medicoId, e.color);
    return {
      id: e.id,
      title: e.pacienteNombre,
      start: e.start.dateTime,
      end: e.end.dateTime,
      backgroundColor: color,
      borderColor: color,
      classNames: e.cobrado ? ['cita-cobrada'] : [],
      // Sólo se mueven citas del sistema que no se han cobrado; los eventos que
      // sólo existen en Google no tienen cita que actualizar
      editable: !!e.citaId && !e.cobrado,
      extendedProps: { ...e, colorAgenda: color }
    };
  }

  cargarEventos(timeMin: string, timeMax: string) {
    this.cargando = true;
    this.calendarService.getEventos(timeMin, timeMax, this.doctorIdSeleccionado).subscribe({
      next: (eventos: any[]) => {
        this.calendarOptions = { ...this.calendarOptions, events: eventos.map(e => this.aEvento(e)) };
        this.totalEnRango = eventos.length;
        this.cargando = false;
      },
      error: (err) => {
        console.error('Error al cargar eventos:', err);
        this.calendarOptions = { ...this.calendarOptions, events: [] };
        this.cargando = false;
      }
    });
  }

  // Lo de hoy, siempre visible en el panel lateral aunque la vista sea otra semana
  cargarHoy(): void {
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    const fin = new Date(inicio); fin.setDate(fin.getDate() + 1);
    this.cargandoHoy = true;
    this.calendarService.getEventos(inicio.toISOString(), fin.toISOString(), this.doctorIdSeleccionado).subscribe({
      next: (eventos: any[]) => {
        this.citasHoy = eventos
          .map(e => ({
            id: e.id,
            inicio: new Date(e.start.dateTime),
            fin: new Date(e.end.dateTime),
            paciente: e.pacienteNombre,
            servicio: e.servicioNombre,
            medico: e.medicoNombre,
            color: this.colorDe(e.medicoId, e.color),
            cobrado: !!e.cobrado,
            datos: e
          }))
          .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
        this.cargandoHoy = false;
      },
      error: () => { this.citasHoy = []; this.cargandoHoy = false; }
    });
  }

  private encabezadoDia(arg: any) {
    if (arg.view.type === 'dayGridMonth') return { html: `<span class="dia-nombre">${arg.text}</span>` };
    const fecha: Date = arg.date;
    const nombre = fecha.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
    return { html: `<span class="dia-nombre">${nombre}</span><span class="dia-numero">${fecha.getDate()}</span>` };
  }

  private escapar(texto: string): string {
    return String(texto || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }

  private contenidoEvento(arg: EventContentArg) {
    const e = arg.event.extendedProps as any;
    const cobrada = e.cobrado ? '<i class="fas fa-circle-check cita-check" title="Cobrada"></i>' : '';
    if (arg.view.type === 'listWeek') {
      return { html: `<span class="cita-lista"><strong>${this.escapar(e.pacienteNombre)}</strong> · ${this.escapar(e.servicioNombre)}${e.medicoNombre ? ` · <span class="cita-medico">${this.escapar(e.medicoNombre)}</span>` : ''} ${cobrada}</span>` };
    }
    if (arg.view.type === 'dayGridMonth') {
      return { html: `<span class="cita-punto" style="background:${arg.event.backgroundColor}"></span><span class="cita-mes"><b>${arg.timeText}</b> ${this.escapar(e.pacienteNombre)}</span>` };
    }
    const detalle = [e.servicioNombre, e.medicoNombre, e.pacienteTelefono].filter(Boolean).map((t: string) => this.escapar(t)).join(' · ');
    return {
      html: `<div class="cita" style="--c:${arg.event.backgroundColor}" title="${this.escapar(e.pacienteNombre)} — ${detalle}">
        <div class="cita-hora">${arg.timeText}${cobrada}</div>
        <div class="cita-paciente">${this.escapar(e.pacienteNombre)}</div>
        <div class="cita-servicio">${this.escapar(e.servicioNombre)}</div>
        ${!this.doctorIdSeleccionado && e.medicoNombre ? `<div class="cita-medico-sm">${this.escapar(e.medicoNombre)}</div>` : ''}
      </div>`
    };
  }

  // ===== Agendar =====

  get doctorFijo(): string | null {
    return this.isDoctorOrSpecialist ? this.doctorIdSeleccionado : null;
  }

  nuevaCita(inicio: Date | null = null, fin: Date | null = null): void {
    if (this.especialistas.length === 0) {
      this.swal.warning('No hay doctores ni especialistas registrados para agendar.');
      return;
    }
    this.nuevaInicio = inicio;
    this.nuevaFin = fin;
    this.nuevaAbierta = true;
  }

  private alSeleccionar(arg: DateSelectArg): void {
    this.api?.unselect();
    if (arg.allDay) {
      // En la vista de mes se elige el día: se propone a las 10:00
      const inicio = new Date(arg.start);
      inicio.setHours(10, 0, 0, 0);
      setTimeout(() => this.nuevaCita(inicio, null));
      return;
    }
    setTimeout(() => this.nuevaCita(arg.start, arg.end));
  }

  cerrarNueva(): void {
    this.nuevaAbierta = false;
  }

  citaCreada(): void {
    this.nuevaAbierta = false;
    this.swal.toast('Cita agendada', '', 'success');
    this.onDoctorChange();
  }

  // ===== Mover una cita (arrastrar / estirar) =====

  private horaLegible(d: Date): string {
    return d.toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  }

  private async alMover(info: any): Promise<void> {
    const e = info.event;
    const datos = e.extendedProps;
    const antes: Date = info.oldEvent.start;
    const cambioDeInicio = +antes !== +e.start;

    const r = await Swal.fire({
      title: '¿Seguro que quieres cambiar la hora?',
      html: `<p style="margin:0 0 8px"><strong>${this.escapar(datos.pacienteNombre)}</strong> · ${this.escapar(datos.servicioNombre)}</p>
             <p style="margin:0;color:var(--adm-tenue)">${this.escapar(this.horaLegible(antes))}</p>
             <p style="margin:2px 0 0;font-weight:600">→ ${this.escapar(this.horaLegible(e.start))}${e.end ? ' – ' + e.end.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }) : ''}</p>`,
      icon: 'question',
      input: cambioDeInicio && datos.pacienteTelefono ? 'checkbox' : undefined,
      inputValue: 1,
      inputPlaceholder: 'Avisar al paciente por WhatsApp',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'No, dejarla',
      reverseButtons: true,
      focusCancel: true
    });
    if (!r.isConfirmed) { info.revert(); return; }
    this.guardarMovimiento(info, { notificar: cambioDeInicio && !!r.value, forzar: false });
  }

  private guardarMovimiento(info: any, opciones: { notificar: boolean; forzar: boolean }): void {
    const e = info.event;
    const fin = e.end || new Date(e.start.getTime() + 60 * 60000);
    this.citasService.moverCita(e.extendedProps.citaId, { fechaHoraInicio: e.start, fechaHoraFin: fin, ...opciones }).subscribe({
      next: (res) => {
        this.onDoctorChange();
        this.mostrarResultadoAviso(res?.notificacion, e.extendedProps.pacienteNombre);
      },
      error: async (err) => {
        if (err.status === 409 && err.error?.conflictos?.length && !opciones.forzar) {
          const lista = err.error.conflictos.map((c: any) => {
            const h = (f: any) => new Date(f).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
            return `<li>${h(c.inicio)}–${h(c.fin)}: ${this.escapar(c.tipo === 'apartado' ? 'alguien está pagando ese horario en línea' : c.paciente || 'otra cita')}</li>`;
          }).join('');
          const r = await Swal.fire({
            title: 'Ese horario está ocupado',
            html: `<ul style="text-align:left;margin:0;padding-left:20px">${lista}</ul>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Moverla de todos modos',
            cancelButtonText: 'Dejarla donde estaba',
            reverseButtons: true,
            focusCancel: true
          });
          if (r.isConfirmed) { this.guardarMovimiento(info, { ...opciones, forzar: true }); return; }
          info.revert();
          return;
        }
        info.revert();
        this.swal.error(err.error?.message || 'No se pudo cambiar el horario.');
      }
    });
  }

  // Si WhatsApp no se pudo mandar solo, recepción lo manda desde su teléfono con el texto listo
  private mostrarResultadoAviso(n: any, paciente: string): void {
    if (!n) { this.swal.toast('Horario actualizado', '', 'success'); return; }
    if (n.enviado) { this.swal.toast('Horario actualizado', `Se le avisó a ${paciente} por WhatsApp`, 'success'); return; }
    if (n.motivo === 'sin_telefono') { this.swal.toast('Horario actualizado', 'El paciente no tiene teléfono para avisarle', 'info'); return; }
    const tel = String(n.telefono || '').replace(/\D/g, '').slice(-10);
    const url = `https://wa.me/52${tel}?text=${encodeURIComponent(n.texto)}`;
    Swal.fire({
      title: 'Horario actualizado',
      html: `<p style="margin:0 0 6px">No se pudo avisar automáticamente: ${this.escapar(paciente)} no ha escrito en las últimas 24 horas y WhatsApp no deja mandarle un mensaje sin una plantilla aprobada.</p>
             <p style="margin:0;color:var(--adm-tenue)">Mándaselo desde el WhatsApp de la clínica, ya va redactado.</p>`,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Abrir WhatsApp',
      cancelButtonText: 'Ahora no'
    }).then(r => { if (r.isConfirmed) window.open(url, '_blank', 'noopener'); });
  }

  handleEventClick(arg: any) {
    this.abrirCita(arg.event.extendedProps);
  }

  abrirCita(datos: any) {
    this.selectedEvent = datos;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    setTimeout(() => this.selectedEvent = null, 300); // Wait for transition
  }

  despuesDeCobrar(): void {
    this.onDoctorChange();
  }
}
