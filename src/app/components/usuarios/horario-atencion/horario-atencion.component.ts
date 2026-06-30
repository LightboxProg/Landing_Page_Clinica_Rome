import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, DiaConfig } from '../../../services/user/user.service';
import { ServiciosService } from '../../../services/servicios/servicios.service';
import { ServiciosDentalesService } from '../../../services/servicios-dentales/servicios-dentales.service';
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
    { id: 1, nombre: 'Lunes', abrev: 'LUN' },
    { id: 2, nombre: 'Martes', abrev: 'MAR' },
    { id: 3, nombre: 'Miercoles', abrev: 'MIE' },
    { id: 4, nombre: 'Jueves', abrev: 'JUE' },
    { id: 5, nombre: 'Viernes', abrev: 'VIE' },
    { id: 6, nombre: 'Sabado', abrev: 'SAB' }
  ];

  // Modo de seleccion de fechas
  modoFechas: 'rango' | 'individual' = 'rango';
  fechaInicio: string = '';
  fechaFin: string = '';
  fechasSeleccionadas: string[] = [];
  fechaIndividual: string = '';

  // Configuracion de consulta
  duracionConsulta: number = 60;
  descansoEntreCitas: number = 0;
  aplicarMismoHorario: boolean = true;
  horaGlobalInicio: string = '09:00';
  horaGlobalFin: string = '18:00';
  intervalosGlobales: any[] = [
    { horaInicio: '09:00', horaFin: '18:00' }
  ];

  // Calendario visual
  calendarYear: number = new Date().getFullYear();
  calendarMonth: number = new Date().getMonth();
  calendarDays: any[] = [];
  nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // Estado de dias
  diasConfig: DiaConfig[] = [];

  // Multiples configuraciones
  configuraciones: any[] = [];
  configuracionSeleccionadaId: string = '';
  nombreConfiguracion: string = 'General';

  // Servicio y Monto de Anticipo
  servicios: any[] = [];
  selectedServiceId: string = '';
  montoAnticipo: number = 500;

  // Estado de config activa
  configActiva: boolean = false;
  configFechaInicio: string | null = null;
  configFechaFin: string | null = null;
  configFechasIndividuales: string[] = [];

  // Loading states
  guardando: boolean = false;
  generando: boolean = false;

  constructor(
    private userService: UserService,
    private serviciosService: ServiciosService,
    private serviciosDentalesService: ServiciosDentalesService
  ) {}

  ngOnInit() {
    this.inicializarDias();
    this.generarCalendario();
    if (this.doctorId) {
      this.cargarServicios();
      this.cargarConfiguracion();
      this.cargarListaConfiguraciones();
    }
  }

  cargarServicios() {
    this.serviciosService.obtenerServicios().subscribe(dataEsteticos => {
      this.serviciosDentalesService.obtenerServicios().subscribe(dataDentales => {
        this.servicios = [...(dataEsteticos || []), ...(dataDentales || [])];
      });
    });
  }

  // Inicializa la estructura de dias con valores por defecto
  inicializarDias() {
    this.diasConfig = this.dias.map(d => ({
      diaSemana: d.id,
      activo: d.id >= 1 && d.id <= 5,
      intervalos: [{ horaInicio: '09:00', horaFin: '18:00' }]
    }));
  }

  // Carga la lista de configuraciones del especialista
  cargarListaConfiguraciones() {
    this.userService.listarConfiguraciones(this.doctorId).subscribe(list => {
      this.configuraciones = list || [];
    });
  }

  // Carga la configuracion activa del backend
  cargarConfiguracion(configId?: string) {
    const obs = configId
      ? this.userService.obtenerConfigDisponibilidadPorId(configId)
      : this.userService.obtenerConfigDisponibilidad(this.doctorId);

    obs.subscribe(config => {
      if (!config) {
        this.configuracionSeleccionadaId = '';
        this.nombreConfiguracion = 'General';
        this.configActiva = false;
        this.selectedServiceId = '';
        this.montoAnticipo = 500;
        this.inicializarDias();
        this.fechaInicio = '';
        this.fechaFin = '';
        this.fechasSeleccionadas = [];
        this.generarCalendario();
        return;
      }

      this.configActiva = true;
      this.configuracionSeleccionadaId = config._id || '';
      this.nombreConfiguracion = config.nombre || 'General';
      this.modoFechas = config.modoFechas || 'rango';
      this.descansoEntreCitas = config.descansoEntreConsultasMinutos || 0;
      this.duracionConsulta = config.duracionConsultaMinutos || 60;
      this.montoAnticipo = config.montoAnticipo !== undefined && config.montoAnticipo !== null ? config.montoAnticipo : 500;
      
      if (config.servicioId) {
        this.selectedServiceId = typeof config.servicioId === 'object' ? config.servicioId._id : config.servicioId;
      } else {
        this.selectedServiceId = '';
      }

      if (config.modoFechas === 'rango') {
        if (config.fechaInicio) {
          this.fechaInicio = new Date(config.fechaInicio).toISOString().split('T')[0];
          this.configFechaInicio = this.fechaInicio;
        }
        if (config.fechaFin) {
          this.fechaFin = new Date(config.fechaFin).toISOString().split('T')[0];
          this.configFechaFin = this.fechaFin;
        }
      } else {
        this.fechasSeleccionadas = (config.fechasSeleccionadas || []).map(f => new Date(f).toISOString().split('T')[0]);
        this.configFechasIndividuales = [...this.fechasSeleccionadas];
      }

      if (config.diasConfig && config.diasConfig.length > 0) {
        for (const dc of config.diasConfig) {
          const idx = this.diasConfig.findIndex(d => d.diaSemana === dc.diaSemana);
          if (idx !== -1) {
            const intervals = dc.intervalos && dc.intervalos.length > 0
              ? dc.intervalos
              : [{ horaInicio: dc.horaInicio || '09:00', horaFin: dc.horaFin || '18:00' }];
            this.diasConfig[idx] = { 
              ...dc,
              intervalos: JSON.parse(JSON.stringify(intervals))
            };
          }
        }
        this.detectarMismoHorario();
      }

      this.generarCalendario();
    });
  }

  // Detecta si todos los dias activos tienen el mismo horario
  detectarMismoHorario() {
    const activos = this.diasConfig.filter(d => d.activo);
    if (activos.length === 0) {
      this.aplicarMismoHorario = true;
      return;
    }
    const primero = activos[0];
    const strPrimero = JSON.stringify(primero.intervalos || []);
    this.aplicarMismoHorario = activos.every(d => JSON.stringify(d.intervalos || []) === strPrimero);
    if (this.aplicarMismoHorario) {
      this.intervalosGlobales = JSON.parse(strPrimero);
    }
  }

  getDiaConfig(diaId: number): any {
    return this.diasConfig.find(d => d.diaSemana === diaId) || { diaSemana: diaId, activo: false, horaInicio: '09:00', horaFin: '18:00', intervalos: [] };
  }

  toggleDia(diaId: number) {
    const dia = this.diasConfig.find(d => d.diaSemana === diaId);
    if (!dia) return;
    dia.activo = !dia.activo;
    if (dia.activo && this.aplicarMismoHorario) {
      dia.intervalos = JSON.parse(JSON.stringify(this.intervalosGlobales));
    }
  }

  agregarIntervaloGlobal() {
    this.intervalosGlobales.push({ horaInicio: '09:00', horaFin: '18:00' });
    this.aplicarHorarioGlobal();
  }

  removerIntervaloGlobal(index: number) {
    this.intervalosGlobales.splice(index, 1);
    this.aplicarHorarioGlobal();
  }

  actualizarIntervaloGlobal(index: number, campo: 'horaInicio' | 'horaFin', valor: string) {
    this.intervalosGlobales[index][campo] = valor;
    this.aplicarHorarioGlobal();
  }

  agregarIntervaloDia(diaId: number) {
    const dia = this.diasConfig.find(d => d.diaSemana === diaId);
    if (!dia) return;
    if (!dia.intervalos) dia.intervalos = [];
    dia.intervalos.push({ horaInicio: '09:00', horaFin: '18:00' });
  }

  removerIntervaloDia(diaId: number, index: number) {
    const dia = this.diasConfig.find(d => d.diaSemana === diaId);
    if (!dia || !dia.intervalos) return;
    dia.intervalos.splice(index, 1);
  }

  actualizarIntervaloDia(diaId: number, index: number, campo: 'horaInicio' | 'horaFin', valor: string) {
    const dia = this.diasConfig.find(d => d.diaSemana === diaId);
    if (!dia || !dia.intervalos) return;
    dia.intervalos[index][campo] = valor;
  }

  aplicarHorarioGlobal() {
    this.diasConfig.forEach(d => {
      if (d.activo) {
        d.intervalos = JSON.parse(JSON.stringify(this.intervalosGlobales));
      }
    });
  }

  generarCalendario() {
    this.calendarDays = [];
    const primerDia = new Date(this.calendarYear, this.calendarMonth, 1);
    const ultimoDia = new Date(this.calendarYear, this.calendarMonth + 1, 0);
    
    // Obtener dia de la semana del primer dia (0 = Domingo, 1 = Lunes, etc.)
    // Ajustar para que la cuadrícula empiece en Lunes (0) a Domingo (6)
    let diaSemanaInicio = primerDia.getDay();
    let diaAjustado = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;
    
    // Rellenar con dias vacios o del mes anterior
    const totalDiasMesAnterior = new Date(this.calendarYear, this.calendarMonth, 0).getDate();
    for (let i = diaAjustado - 1; i >= 0; i--) {
      const diaNum = totalDiasMesAnterior - i;
      const fecha = new Date(this.calendarYear, this.calendarMonth - 1, diaNum);
      this.calendarDays.push({
        diaNum,
        fecha,
        esMesActual: false,
        esDomingo: fecha.getDay() === 0,
        esPasado: this.esFechaPasada(fecha),
        fechaFormateada: this.formatearFechaISO(fecha)
      });
    }
    
    // Dias del mes actual
    const totalDiasMes = ultimoDia.getDate();
    for (let i = 1; i <= totalDiasMes; i++) {
      const fecha = new Date(this.calendarYear, this.calendarMonth, i);
      this.calendarDays.push({
        diaNum: i,
        fecha,
        esMesActual: true,
        esDomingo: fecha.getDay() === 0,
        esPasado: this.esFechaPasada(fecha),
        fechaFormateada: this.formatearFechaISO(fecha)
      });
    }
    
    // Rellenar hasta completar multiplo de 7 (para la cuadricula de semanas)
    const celdasRestantes = 42 - this.calendarDays.length;
    for (let i = 1; i <= celdasRestantes; i++) {
      const fecha = new Date(this.calendarYear, this.calendarMonth + 1, i);
      this.calendarDays.push({
        diaNum: i,
        fecha,
        esMesActual: false,
        esDomingo: fecha.getDay() === 0,
        esPasado: this.esFechaPasada(fecha),
        fechaFormateada: this.formatearFechaISO(fecha)
      });
    }
  }

  esFechaPasada(fecha: Date): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fecha < hoy;
  }

  formatearFechaISO(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  cambiarMes(offset: number) {
    this.calendarMonth += offset;
    if (this.calendarMonth > 11) {
      this.calendarMonth = 0;
      this.calendarYear++;
    } else if (this.calendarMonth < 0) {
      this.calendarMonth = 11;
      this.calendarYear--;
    }
    this.generarCalendario();
  }

  seleccionarDia(dia: any) {
    if (dia.esDomingo || dia.esPasado) return;
    
    const fechaStr = dia.fechaFormateada;
    
    if (this.modoFechas === 'rango') {
      if (!this.fechaInicio || (this.fechaInicio && this.fechaFin)) {
        this.fechaInicio = fechaStr;
        this.fechaFin = '';
      } else {
        if (new Date(fechaStr) < new Date(this.fechaInicio)) {
          this.fechaInicio = fechaStr;
        } else {
          this.fechaFin = fechaStr;
        }
      }
    } else {
      const index = this.fechasSeleccionadas.indexOf(fechaStr);
      if (index > -1) {
        this.fechasSeleccionadas.splice(index, 1);
      } else {
        this.fechasSeleccionadas.push(fechaStr);
      }
      this.fechasSeleccionadas.sort();
    }
  }

  esDiaSeleccionado(dia: any): boolean {
    if (this.modoFechas === 'rango') {
      return dia.fechaFormateada === this.fechaInicio || dia.fechaFormateada === this.fechaFin;
    } else {
      return this.fechasSeleccionadas.includes(dia.fechaFormateada);
    }
  }

  esDiaEnRango(dia: any): boolean {
    if (this.modoFechas !== 'rango' || !this.fechaInicio || !this.fechaFin) return false;
    const f = new Date(dia.fechaFormateada);
    return f > new Date(this.fechaInicio) && f < new Date(this.fechaFin);
  }

  formatearFecha(fecha: string): string {
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  get diasActivosCount(): number {
    return this.diasConfig.filter(d => d.activo).length;
  }

  guardarConfig() {
    if (!this.validarConfig()) return;

    this.guardando = true;
    const payload = this.construirPayload();

    this.userService.guardarConfigDisponibilidad(payload).subscribe({
      next: (res: any) => {
        this.guardando = false;
        this.configActiva = true;
        this.configuracionSeleccionadaId = res._id || '';
        this.nombreConfiguracion = res.nombre || 'General';
        this.actualizarEstadoConfig();
        this.cargarListaConfiguraciones();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Configuracion guardada', showConfirmButton: false, timer: 2000 });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('Error', err.error?.message || 'Error al guardar la configuracion.', 'error');
      }
    });
  }

  generarDisponibilidad() {
    if (!this.validarConfig()) return;

    this.generando = true;
    const payload = this.construirPayload();

    this.userService.guardarConfigDisponibilidad(payload).subscribe({
      next: (resSaved: any) => {
        this.configuracionSeleccionadaId = resSaved._id || '';
        this.nombreConfiguracion = resSaved.nombre || 'General';
        this.cargarListaConfiguraciones();
        this.userService.configurarDisponibilidad(this.doctorId, this.configuracionSeleccionadaId).subscribe({
          next: (res) => {
            this.generando = false;
            this.configActiva = true;
            this.actualizarEstadoConfig();
            Swal.fire('Listo', `Se generaron ${res.count} horarios disponibles para compartir.`, 'success');
          },
          error: (err) => {
            this.generando = false;
            Swal.fire('Error', err.error?.message || 'Error al generar slots.', 'error');
          }
        });
      },
      error: (err) => {
        this.generando = false;
        Swal.fire('Error', err.error?.message || 'Error al guardar configuracion.', 'error');
      }
    });
  }

  cambiarConfiguracion(configId: string) {
    if (!configId) {
      Swal.fire({
        title: 'Nueva Disponibilidad',
        text: 'Ingresa un nombre para identificar este enlace:',
        input: 'text',
        inputPlaceholder: 'Ej. Disponibilidad Septiembre',
        showCancelButton: true,
        confirmButtonText: 'Crear',
        cancelButtonText: 'Cancelar'
      }).then(result => {
        if (result.isConfirmed && result.value) {
          this.configuracionSeleccionadaId = '';
          this.nombreConfiguracion = result.value;
          this.configActiva = false;
          this.inicializarDias();
          this.fechaInicio = '';
          this.fechaFin = '';
          this.fechasSeleccionadas = [];
          this.generarCalendario();
        } else {
          this.configuracionSeleccionadaId = this.configuraciones[0]?._id || '';
        }
      });
    } else {
      this.cargarConfiguracion(configId);
    }
  }

  eliminarConfig() {
    if (!this.configuracionSeleccionadaId) return;
    Swal.fire({
      title: '¿Eliminar configuración?',
      text: 'Se eliminarán esta configuración y sus horarios generados.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.userService.eliminarConfiguracion(this.configuracionSeleccionadaId).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'La configuración ha sido eliminada.', 'success');
            this.cargarListaConfiguraciones();
            this.cargarConfiguracion();
          }
        });
      }
    });
  }

  copiarEnlaceConfig() {
    if (!this.configuracionSeleccionadaId) {
      Swal.fire('Guarda primero', 'Debes guardar la configuración antes de compartir el enlace.', 'info');
      return;
    }
    const host = window.location.origin;
    const shareUrl = `${host}/agendar-cita?config=${this.configuracionSeleccionadaId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Enlace copiado', showConfirmButton: false, timer: 2000 });
    });
  }

  private actualizarEstadoConfig() {
    if (this.modoFechas === 'rango') {
      this.configFechaInicio = this.fechaInicio;
      this.configFechaFin = this.fechaFin;
    } else {
      this.configFechasIndividuales = [...this.fechasSeleccionadas];
    }
  }

  private validarConfig(): boolean {
    if (this.diasActivosCount === 0) {
      Swal.fire('Sin dias activos', 'Activa al menos un dia de la semana.', 'warning');
      return false;
    }

    if (this.modoFechas === 'rango') {
      if (!this.fechaInicio || !this.fechaFin) {
        Swal.fire('Fechas requeridas', 'Selecciona la fecha de inicio y fin del rango.', 'warning');
        return false;
      }
      if (new Date(this.fechaInicio) > new Date(this.fechaFin)) {
        Swal.fire('Rango invalido', 'La fecha de inicio no puede ser posterior a la fecha de fin.', 'warning');
        return false;
      }
    } else {
      if (this.fechasSeleccionadas.length === 0) {
        Swal.fire('Sin fechas', 'Selecciona al menos una fecha en el calendario.', 'warning');
        return false;
      }
    }

    return true;
  }

  private construirPayload(): any {
    return {
      configId: this.configuracionSeleccionadaId || undefined,
      nombre: this.nombreConfiguracion,
      doctorId: this.doctorId,
      modoFechas: this.modoFechas,
      fechaInicio: this.modoFechas === 'rango' ? this.fechaInicio : undefined,
      fechaFin: this.modoFechas === 'rango' ? this.fechaFin : undefined,
      fechasSeleccionadas: this.modoFechas === 'individual' ? this.fechasSeleccionadas : [],
      diasConfig: this.diasConfig,
      descansoEntreConsultasMinutos: this.descansoEntreCitas,
      servicioId: this.selectedServiceId || undefined,
      montoAnticipo: this.montoAnticipo
    };
  }
}
