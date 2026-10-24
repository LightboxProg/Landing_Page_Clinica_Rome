import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService, DoctorPublic, SlotPublic } from '../../services/booking/booking.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { ServiciosDentalesService } from '../../services/servicios-dentales/servicios-dentales.service';
import { PromocionesService, precioConDescuento } from '../../services/promociones/promociones.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-agendar-cita',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './agendar-cita.component.html',
  styleUrl: './agendar-cita.component.css'
})
export class AgendarCitaComponent implements OnInit, OnDestroy {
  step: number = 1;
  telefonoInput: string = '';
  loading: boolean = false;
  errorMessage: string = '';
  paciente: any = null;

  nuevoPaciente: any = {
    nombre: '',
    apeP: '',
    apeM: '',
    correoElectronico: '',
    fechaNac: '',
    genero: 'Otro'
  };

  doctores: DoctorPublic[] = [];
  selectedDoctorId: string = '';
  selectedTipoCita: string = '';
  selectedFecha: string = '';
  slots: SlotPublic[] = [];
  selectedSlot: SlotPublic | null = null;
  selectedSlotTemp: SlotPublic | null = null;
  hasUrlDoctor: boolean = false;
  selectedConfigId: string = '';
  activeConfig: any = null;
  servicios: any[] = [];
  selectedServiceId: string = '';
  selectedService: any = null;
  fechasDisponibles: string[] = [];
  showManualDate: boolean = false;
  // ?servicio= desde la página de promociones: se preselecciona al cargar el catálogo
  servicioUrl: string = '';
  promocionesVigentes: any[] = [];
  // ?promo=&paquete= desde la página de promociones: se compra ese paquete
  paqueteUrl: { promocionId: string; itemId: string } | null = null;
  paquete: any = null;
  paqueteNoDisponible = false;
  readonly soloPromos = environment.agendaSoloPromos;
  // Llegó desde una promoción (?servicio o ?paquete). No se borra al preseleccionar el
  // tratamiento, a diferencia de servicioUrl: decide si se puede cambiar de área.
  vieneDePromo = false;

  // Área elegida en el modal de entrada (?area=dental|estetica). Sólo se
  // muestran los especialistas y horarios de esa área.
  area: 'Dental' | 'Estetica' | null = null;
  selectorArea = false;

  // Pago dentro de la página (Stripe Checkout en modo elements). Sin clave pública en el
  // backend llega `urlPago` y el botón abre el checkout de Stripe como antes.
  pagoListo = false;
  pagoCargando = false;
  pagoError = '';
  urlPago = '';
  pedirCorreo = false;
  correoPago = '';
  // Sin esta casilla el backend no crea el cobro; se guarda en la cita cuándo se aceptó
  aceptaTerminos = false;
  private checkoutStripe: any = null;
  private accionesPago: any = null;

  timeLeft: number = 900; // 15 minutos en segundos
  timerInterval: any = null;
  formattedTime: string = '15:00';

  constructor(
    private bookingService: BookingService,
    private route: ActivatedRoute,
    private serviciosService: ServiciosService,
    private serviciosDentalesService: ServiciosDentalesService,
    private promosService: PromocionesService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.hasUrlDoctor = !!params['doctor'] || !!params['config'];
      this.servicioUrl = params['servicio'] || '';
      this.vieneDePromo = !!params['servicio'] || !!(params['promo'] && params['paquete']);
      this.paqueteUrl = params['promo'] && params['paquete']
        ? { promocionId: params['promo'], itemId: params['paquete'] }
        : null;
      const area = String(params['area'] || '').toLowerCase();
      this.area = area === 'dental' ? 'Dental' : area === 'estetica' ? 'Estetica' : null;
      // Promociones y paquetes son de estética
      if (!this.area && (this.servicioUrl || this.paqueteUrl)) this.area = 'Estetica';
      // Con médico o configuración en el link el área ya está decidida
      this.selectorArea = !this.area && !this.hasUrlDoctor;
      // Arranque: sólo se agenda desde una promoción; sin una, a la página de promociones
      if (environment.agendaSoloPromos && !this.servicioUrl && !this.paqueteUrl) {
        this.router.navigate(['/promociones'], { replaceUrl: true });
      }
    });
    this.promosService.obtenerPromocionesActivas().subscribe({
      next: (promos) => {
        this.promocionesVigentes = promos || [];
        this.resolverPaquete();
        this.cargarDoctores();
      },
      error: () => {
        this.promocionesVigentes = [];
        this.resolverPaquete();
        this.cargarDoctores();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.cerrarPago();
  }

  // Importe que realmente se cobrará ahora. Refleja exactamente la lógica
  // del backend (checkout.controller): si la configuración de disponibilidad
  // define un anticipo, ese manda sobre el costo del servicio.
  // Busca el paquete de la URL entre las promociones vigentes. Se agenda como
  // su primer servicio; el backend vuelve a validar precio y cupo al cobrar.
  private resolverPaquete(): void {
    if (!this.paqueteUrl) return;
    const promo = this.promocionesVigentes.find(p => String(p._id) === String(this.paqueteUrl!.promocionId));
    const item = promo?.items?.find((i: any) => String(i._id) === String(this.paqueteUrl!.itemId) && i.tipo === 'Paquete');
    if (!promo || !item || !item.servicios?.length) {
      this.paqueteUrl = null;
      this.paqueteNoDisponible = true;
      return;
    }
    this.paquete = { ...item, promocionNombre: promo.nombre, fechaFin: promo.fechaFin };
    this.servicioUrl = String(item.servicios[0].servicioId);
  }

  get incluyePaquete(): string {
    return (this.paquete?.servicios || [])
      .map((s: any) => (s.cantidad > 1 ? `${s.cantidad} × ${s.nombre}` : s.nombre))
      .join(' + ');
  }

  // Con promoción el anticipo no pasa del precio final, igual que el backend.
  get montoApartado(): number {
    const anticipo = this.activeConfig?.montoAnticipo;
    const promo = this.promoDelServicio;
    if (anticipo !== undefined && anticipo !== null) {
      return promo ? Math.min(Number(anticipo), promo.precioFinal) : Number(anticipo);
    }
    return this.costoTratamiento ?? 500;
  }

  // Precio que se cobrará por el tratamiento (con promoción si aplica)
  get costoTratamiento(): number | undefined {
    if (this.paquete) return this.paquete.precioFinal;
    return this.promoDelServicio?.precioFinal ?? this.selectedService?.costo;
  }

  // Precio de lista a mostrar tachado (paquete: suma de sus servicios)
  get costoLista(): number | undefined {
    return this.paquete ? this.paquete.precioLista : this.selectedService?.costo;
  }

  // Mejor promoción vigente para el servicio elegido (sólo estética), con la
  // misma regla que promociones.service.mejorPrecio. El backend la vuelve a
  // calcular al pagar; aquí sólo se muestra.
  get promoDelServicio(): { nombre: string; precioFinal: number; fechaFin?: string } | null {
    if (this.paquete) return { nombre: this.paquete.promocionNombre, precioFinal: this.paquete.precioFinal, fechaFin: this.paquete.fechaFin };
    return this.promoPara(this.selectedService);
  }

  // Tratamientos del selector: en el arranque sólo los que tienen promoción vigente
  get serviciosElegibles(): any[] {
    return this.soloPromos ? this.servicios.filter(s => this.promoPara(s)) : this.servicios;
  }

  // Paquetes de las promociones vigentes: van en el mismo selector que los tratamientos
  // (sólo estética; los paquetes son de esa área)
  get paquetesElegibles(): { valor: string; nombre: string }[] {
    if (this.selectedTipoCita === 'Dental' || this.area === 'Dental') return [];
    return this.promocionesVigentes.flatMap(p => (p.items || [])
      .filter((i: any) => i.tipo === 'Paquete' && i.servicios?.length)
      .map((i: any) => ({ valor: `p:${p._id}:${i._id}`, nombre: i.nombre })));
  }

  // Lo elegido en el selector: "s:<servicio>" o "p:<promo>:<paquete>"
  get ofertaElegida(): string {
    if (this.paqueteUrl) return `p:${this.paqueteUrl.promocionId}:${this.paqueteUrl.itemId}`;
    return this.selectedServiceId ? `s:${this.selectedServiceId}` : '';
  }

  // Cambiar entre tratamiento y paquete: el paquete fija precio, duración y servicio con que se agenda
  onOfertaChange(valor: string): void {
    const [tipo, a, b] = String(valor || '').split(':');
    this.paquete = null;
    this.paqueteUrl = null;
    this.paqueteNoDisponible = false;
    if (tipo === 'p') {
      this.paqueteUrl = { promocionId: a, itemId: b };
      this.resolverPaquete();
      this.selectedServiceId = this.servicioUrl;
      this.servicioUrl = '';
    } else {
      this.selectedServiceId = a || '';
    }
    this.onServiceChange();
  }

  private promoPara(s: any): { nombre: string; precioFinal: number; fechaFin?: string } | null {
    if (!s || this.selectedTipoCita === 'Dental' || !s.costo) return null;
    const categoriaId = s.categoria ? String(s.categoria._id || s.categoria) : null;
    let mejor: { nombre: string; precioFinal: number; fechaFin?: string } | null = null;
    for (const p of this.promocionesVigentes) {
      for (const item of p.items || []) {
        const aplica = (item.tipo === 'Servicio' && String(item.servicioId) === String(s._id))
          || (item.tipo === 'Categoria' && categoriaId && String(item.categoriaId) === categoriaId);
        if (!aplica) continue;
        const precioFinal = precioConDescuento(s.costo, item.tipoDescuento, item.valor);
        if (precioFinal < s.costo && (!mejor || precioFinal < mejor.precioFinal)) {
          mejor = { nombre: p.nombre, precioFinal, fechaFin: p.fechaFin };
        }
      }
    }
    return mejor;
  }

  // Lo que se ahorra con la promoción, para decirlo en el resumen
  get ahorro(): number {
    return this.promoDelServicio ? Math.max(0, (this.costoLista ?? 0) - (this.costoTratamiento ?? 0)) : 0;
  }

  // ¿El apartado es menor que el tratamiento? Entonces sí es un anticipo.
  get apartadoEsParcial(): boolean {
    return !!this.selectedService && this.montoApartado < (this.costoTratamiento ?? 0);
  }

  formatearPrecio(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor ?? 0);
  }

  // ===== Área (dental / estética) =====

  get doctoresVisibles(): DoctorPublic[] {
    return this.area ? this.doctores.filter(d => d.atencion === this.area) : this.doctores;
  }

  hayDoctoresDe(area: 'Dental' | 'Estetica'): boolean {
    return this.doctores.some(d => d.atencion === area);
  }

  elegirArea(area: 'Dental' | 'Estetica'): void {
    const cambio = this.area !== area;
    this.area = area;
    this.selectorArea = false;
    // En la URL, para que recargar o regresar no vuelva a preguntar
    this.router.navigate([], { relativeTo: this.route, queryParams: { area: area === 'Dental' ? 'dental' : 'estetica' }, queryParamsHandling: 'merge', replaceUrl: true });
    if (cambio) {
      this.selectedDoctorId = '';
      this.selectedServiceId = '';
      this.selectedService = null;
      this.slots = [];
      this.selectedSlotTemp = null;
      this.fechasDisponibles = [];
    }
    this.autoelegirDoctor();
  }

  cambiarArea(): void {
    this.selectorArea = true;
  }

  salirSelector(): void {
    // Sin área no hay qué mostrar: cerrar el modal regresa al inicio
    if (!this.area) { this.router.navigate(['/']); return; }
    this.selectorArea = false;
  }

  // Si el área tiene un solo especialista se elige solo: van directo a los horarios
  private autoelegirDoctor(): void {
    if (this.selectedDoctorId || this.hasUrlDoctor) return;
    const visibles = this.doctoresVisibles;
    if (visibles.length === 1) {
      this.selectedDoctorId = String(visibles[0]._id);
      this.onDoctorOrFechaChange();
    }
  }

  // Obtiene el objeto doctor seleccionado
  getSelectedDoctor(): DoctorPublic | undefined {
    return this.doctores.find(d => d._id === this.selectedDoctorId);
  }

  // Carga la lista de doctores activos y preselecciona por queryParam si existe
  cargarDoctores(): void {
    this.loading = true;
    this.bookingService.obtenerDoctoresPublicos().subscribe({
      next: (res) => {
        this.doctores = res;
        this.loading = false;

        this.route.queryParams.subscribe(params => {
          const configId = params['config'];
          const docId = params['doctor'];

          if (configId) {
            this.selectedConfigId = configId;
            this.bookingService.obtenerConfigDisponibilidadPorId(configId).subscribe({
              next: (config) => {
                if (config) {
                  this.activeConfig = config;
                  this.selectedDoctorId = typeof config.doctorId === 'object' && config.doctorId._id ? String(config.doctorId._id) : String(config.doctorId);
                  this.selectedTipoCita = config.tipoServicio === 'ServicioDental' ? 'Dental' : 'Estetica';
                  this.cargarServiciosDoctor();
                  if (this.selectedFecha) {
                    this.onDoctorOrFechaChange();
                  }
                }
              }
            });
          } else if (docId && this.doctores.some(d => String(d._id) === String(docId))) {
            this.selectedDoctorId = String(docId);
            this.onDoctorOrFechaChange();
          } else if (this.servicioUrl && !this.selectedDoctorId) {
            // Las promociones son de estética: se propone al primer especialista de estética
            const estetica = this.doctores.find(d => d.atencion === 'Estetica');
            if (estetica) {
              this.selectedDoctorId = String(estetica._id);
              this.onDoctorOrFechaChange();
            }
          } else if (this.area) {
            this.autoelegirDoctor();
          }
        });
      },
      error: (err) => {
        this.errorMessage = 'No se pudo obtener la lista de especialistas.';
        this.loading = false;
      }
    });
  }

  // Busca el paciente por teléfono e inicia reserva del slot
  buscarTelefono(): void {
    if (!this.telefonoInput || this.telefonoInput.length < 10) {
      this.errorMessage = 'Ingresa un número telefónico válido de 10 dígitos.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    const cleanPhone = this.telefonoInput.replace(/\D/g, '');
    this.bookingService.buscarPacientePorTelefono(cleanPhone).subscribe({
      next: (res) => {
        this.paciente = res;
        this.apartarSlotYProceder(res._id);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 404) {
          this.step = 3; // Ir a registro si no existe
        } else {
          this.errorMessage = 'Ocurrió un error al buscar tu número de teléfono.';
        }
      }
    });
  }

  // Registra un nuevo paciente y aparta el slot
  registrarPaciente(): void {
    if (!this.nuevoPaciente.nombre || !this.nuevoPaciente.apeP) {
      this.errorMessage = 'El nombre y el primer apellido son obligatorios.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    const cleanPhone = this.telefonoInput.replace(/\D/g, '');
    const payload = {
      ...this.nuevoPaciente,
      telefonoPaciente: Number(cleanPhone),
      telefonoWhatsapp: Number(cleanPhone),
      apodo: this.nuevoPaciente.nombre
    };

    this.bookingService.crearPaciente(payload).subscribe({
      next: (res) => {
        this.paciente = res;
        this.apartarSlotYProceder(res._id);
      },
      error: (err) => {
        this.errorMessage = 'No se pudo crear el registro del paciente.';
        this.loading = false;
      }
    });
  }

  // Aparta el slot temporalmente en el backend
  apartarSlotYProceder(pacienteId: string): void {
    if (!this.selectedSlotTemp) {
      this.errorMessage = 'No se ha seleccionado un horario.';
      this.loading = false;
      this.step = 1;
      return;
    }
    this.bookingService.apartarSlot(this.selectedSlotTemp._id, pacienteId, this.paquete?.minutos).subscribe({
      next: (res) => {
        // Un combo toma varios horarios: el apartado dice dónde termina
        this.selectedSlot = { ...this.selectedSlotTemp!, horaFin: res?.horaFin || this.selectedSlotTemp!.horaFin };
        this.loading = false;
        this.step = 4; // Ir a pago
        this.iniciarCronometro();
        this.aceptaTerminos = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'El horario ya no está disponible. Elige otro espacio.';
        this.loading = false;
        this.step = 1; // Regresar a selección de slots
        this.onDoctorOrFechaChange();
      }
    });
  }

  cargarServiciosDoctor(): void {
    if (!this.selectedDoctorId) return;

    forkJoin({
      esteticos: this.serviciosService.obtenerServicios(),
      dentales: this.serviciosDentalesService.obtenerServicios()
    }).subscribe({
      next: (res) => {
        const esteticos = Array.isArray(res.esteticos) ? res.esteticos : [];
        const dentales = Array.isArray(res.dentales) ? res.dentales : [];

        if (this.activeConfig && this.activeConfig.tipoServicio === 'ServicioDental') {
          this.servicios = dentales.length > 0 ? dentales : esteticos;
        } else if (this.activeConfig && this.activeConfig.tipoServicio === 'ServicioEstetico') {
          this.servicios = esteticos.length > 0 ? esteticos : dentales;
        } else {
          const doc = this.doctores.find(d => String(d._id) === String(this.selectedDoctorId));
          if (doc && doc.atencion === 'Dental') {
            this.servicios = dentales.length > 0 ? dentales : esteticos;
          } else {
            this.servicios = esteticos.length > 0 ? esteticos : dentales;
          }
        }

        if (this.activeConfig && this.activeConfig.servicioId) {
          const sId = typeof this.activeConfig.servicioId === 'object' ? this.activeConfig.servicioId._id : this.activeConfig.servicioId;
          if (sId) {
            this.selectedServiceId = String(sId);
            this.onServiceChange();
          }
        } else if (this.servicioUrl && this.servicios.some(s => String(s._id) === String(this.servicioUrl))) {
          this.selectedServiceId = String(this.servicioUrl);
          this.servicioUrl = '';
          this.onServiceChange();
        } else if (this.servicios.length > 0 && !this.selectedServiceId) {
          this.selectedServiceId = String(this.servicios[0]._id);
          this.onServiceChange();
        }
      },
      error: (err) => {
        console.error('Error al cargar catalogo de servicios', err);
      }
    });
  }

  onServiceChange(): void {
    this.selectedService = this.servicios.find(s => String(s._id) === String(this.selectedServiceId)) || null;
    if (this.selectedDoctorId) {
      this.cargarFechasDisponibles();
    }
  }

  // Último día de la promoción ("YYYY-MM-DD", hora de la clínica). Con promo sólo se
  // agenda dentro de sus fechas: el backend cobra precio de lista fuera de ellas.
  get finPromo(): string | null {
    const fin = this.promoDelServicio?.fechaFin;
    if (!fin) return null;
    return new Date(fin).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  }

  get fechasVisibles(): string[] {
    const fin = this.finPromo;
    return fin ? this.fechasDisponibles.filter(f => f.slice(0, 10) <= fin) : this.fechasDisponibles;
  }

  cargarFechasDisponibles(): void {
    if (!this.selectedDoctorId) return;
    this.bookingService.obtenerFechasDisponibles(this.selectedDoctorId, this.selectedConfigId).subscribe({
      next: (fechas) => {
        this.fechasDisponibles = fechas || [];
        const visibles = this.fechasVisibles;
        if (visibles.length > 0) {
          if (!this.selectedFecha || !visibles.includes(this.selectedFecha)) {
            this.selectedFecha = visibles[0];
            this.onDoctorOrFechaChange();
          }
        } else if (this.finPromo) {
          // La promo ya no tiene días libres: no se muestran horarios de otras fechas
          this.selectedFecha = '';
          this.slots = [];
        }
        if (this.finPromo) this.showManualDate = false;
      }
    });
  }

  seleccionarFechaRapida(fecha: string): void {
    this.selectedFecha = fecha;
    this.onDoctorOrFechaChange();
  }

  parseFechaParts(fechaStr: string): { diaSemana: string, diaNumero: string, mes: string } {
    if (!fechaStr) return { diaSemana: '', diaNumero: '', mes: '' };
    const parts = fechaStr.split('-');
    if (parts.length < 3) return { diaSemana: '', diaNumero: '', mes: '' };
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(year, month, day));
    const dias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return {
      diaSemana: dias[date.getUTCDay()],
      diaNumero: date.getUTCDate().toString(),
      mes: meses[date.getUTCMonth()]
    };
  }

  // "sábado 24 de octubre" a partir de "2026-10-24"
  fechaLarga(fechaStr: string | Date | undefined | null): string {
    if (!fechaStr) return '';
    const fecha = typeof fechaStr === 'string' ? new Date(`${fechaStr.slice(0, 10)}T00:00:00Z`) : fechaStr;
    return fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  }

  get slotsManana(): SlotPublic[] {
    return this.slots.filter(s => s.horaInicio < '12:00');
  }

  get slotsTarde(): SlotPublic[] {
    return this.slots.filter(s => s.horaInicio >= '12:00');
  }

  // El teléfono sólo admite dígitos, aunque lo peguen con espacios o guiones
  limpiarTelefono(): void {
    let digitos = (this.telefonoInput || '').replace(/\D/g, '');
    if (digitos.length > 10 && digitos.startsWith('52')) digitos = digitos.replace(/^521?/, '');
    this.telefonoInput = digitos.slice(0, 10);
  }

  // Carga los slots disponibles cuando cambian doctor o fecha
  onDoctorOrFechaChange(): void {
    if (this.selectedDoctorId) {
      const doc = this.doctores.find(d => String(d._id) === String(this.selectedDoctorId));
      if (this.activeConfig && this.activeConfig.tipoServicio) {
        this.selectedTipoCita = this.activeConfig.tipoServicio === 'ServicioDental' ? 'Dental' : 'Estetica';
      } else if (doc) {
        this.selectedTipoCita = doc.atencion;
      }
      const activeDocId = this.activeConfig ? (typeof this.activeConfig.doctorId === 'object' ? this.activeConfig.doctorId._id : this.activeConfig.doctorId) : null;
      if (!this.activeConfig || String(activeDocId) !== String(this.selectedDoctorId)) {
        const obs = this.selectedConfigId
          ? this.bookingService.obtenerConfigDisponibilidadPorId(this.selectedConfigId)
          : this.bookingService.obtenerConfigDisponibilidad(this.selectedDoctorId);

        obs.subscribe({
          next: (config) => {
            this.activeConfig = config;
            if (config && config.tipoServicio) {
              this.selectedTipoCita = config.tipoServicio === 'ServicioDental' ? 'Dental' : 'Estetica';
            }
            this.cargarServiciosDoctor();
            this.cargarFechasDisponibles();
          },
          error: (err) => {
            console.error('Error al cargar la configuracion', err);
          }
        });
      } else {
        if (this.servicios.length === 0) {
          this.cargarServiciosDoctor();
        }
        if (this.fechasDisponibles.length === 0) {
          this.cargarFechasDisponibles();
        }
      }
    }
    if (this.selectedDoctorId && this.selectedFecha) {
      this.loading = true;
      this.bookingService.obtenerSlots(this.selectedDoctorId, this.selectedFecha, this.selectedConfigId, this.paquete?.minutos).subscribe({
        next: (res) => {
          this.slots = (res || []).filter(s => s.estado === 'Disponible' || s.estado === 'Libre');
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = 'No se pudieron cargar los horarios disponibles.';
          this.loading = false;
        }
      });
    }
  }

  // Arranque: el tratamiento elegido ya no tiene promoción (cerró o no aplica)
  get sinPromo(): boolean {
    return environment.agendaSoloPromos && !!this.selectedService && !this.promoDelServicio;
  }

  // Guarda la selección temporal del slot y avanza al login/teléfono
  seleccionarSlot(slot: SlotPublic): void {
    if (this.sinPromo) return;
    this.selectedSlotTemp = slot;
    this.step = 2; // Ir a ingreso de teléfono
  }

  // Inicia la cuenta regresiva de 15 minutos
  iniciarCronometro(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timeLeft = 900; // 15 minutos
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      this.formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        this.cerrarPago();
        this.selectedSlot = null;
        this.selectedSlotTemp = null;
        this.step = 1;
        this.errorMessage = 'El tiempo de reserva (15 minutos) ha expirado. Selecciona otro horario.';
      }
    }, 1000);
  }

  // Redirecciona a Stripe Checkout para pagar el anticipo
  // Crea la sesión de pago y monta el formulario de Stripe en #pago-stripe
  prepararPago(): void {
    if (!this.selectedSlot || !this.paciente || !this.selectedServiceId) return;
    this.cerrarPago();
    this.pagoCargando = true;
    this.bookingService.crearCheckoutSesionCita(
      this.selectedSlot._id,
      this.paciente._id,
      this.selectedTipoCita,
      this.selectedServiceId,
      this.paqueteUrl || undefined,
      true,
      this.aceptaTerminos
    ).subscribe({
      next: async (res) => {
        if (!res.clientSecret) {
          this.urlPago = res.url;
          this.pagoCargando = false;
          return;
        }
        try {
          await this.montarPago(res.publishableKey, res.clientSecret);
          this.pedirCorreo = !res.correo;
          this.pagoListo = true;
        } catch (e) {
          console.error('No se pudo cargar el formulario de pago', e);
          this.pagoError = 'No se pudo cargar el formulario de pago. Recarga la página o intenta más tarde.';
        }
        this.pagoCargando = false;
      },
      error: () => {
        this.pagoCargando = false;
        this.pagoError = 'Ocurrió un error al iniciar el pago. Intenta de nuevo.';
      }
    });
  }

  private async montarPago(publishableKey: string, clientSecret: string): Promise<void> {
    // Se carga aparte para no sumar Stripe al bundle inicial
    const { loadStripe } = await import('@stripe/stripe-js');
    const stripe = await loadStripe(publishableKey, { locale: 'es-419' });
    if (!stripe) throw new Error('Stripe.js no cargó');

    this.checkoutStripe = stripe.initCheckoutElementsSdk({
      clientSecret,
      elementsOptions: {
        fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap' }],
        appearance: APARIENCIA_PAGO
      }
    });
    const resultado = await this.checkoutStripe.loadActions();
    if (resultado.type !== 'success') throw new Error(resultado.error?.message || 'loadActions');
    this.accionesPago = resultado.actions;

    // El contenedor existe en cuanto Angular pinta el paso 4
    this.cdr.detectChanges();
    const elemento = this.checkoutStripe.createPaymentElement({ layout: 'tabs' });
    elemento.mount('#pago-stripe');
  }

  private cerrarPago(): void {
    try { this.checkoutStripe?.getPaymentElement()?.destroy(); } catch { /* ya se había desmontado */ }
    this.checkoutStripe = null;
    this.accionesPago = null;
    this.pagoListo = false;
    this.pagoError = '';
    this.urlPago = '';
  }

  get correoValido(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correoPago.trim());
  }

  // Al marcar la casilla por primera vez se crea el cobro y aparece el formulario de tarjeta
  alCambiarTerminos(): void {
    if (this.aceptaTerminos && !this.pagoListo && !this.urlPago && !this.pagoCargando) this.prepararPago();
  }

  async pagarAnticipo(): Promise<void> {
    if (!this.aceptaTerminos) {
      this.pagoError = 'Para pagar acepta los términos y condiciones.';
      return;
    }
    if (this.urlPago) {
      window.location.href = this.urlPago;
      return;
    }
    if (!this.accionesPago) return;
    if (this.pedirCorreo && !this.correoValido) {
      this.pagoError = 'Escribe un correo válido para enviarte el comprobante.';
      return;
    }
    this.loading = true;
    this.pagoError = '';
    // Si sale bien, Stripe lleva a la página de confirmación (la misma del checkout de siempre)
    const resultado = await this.accionesPago.confirm(this.pedirCorreo ? { email: this.correoPago.trim() } : {});
    if (resultado.type === 'error') {
      this.pagoError = resultado.error?.message || 'No se pudo completar el pago. Revisa los datos de tu tarjeta.';
      this.loading = false;
    }
  }

  // Retorna la fecha mínima para el datepicker
  getMinDate(): string {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Regresa a un paso anterior en el flujo
  volverPaso(paso: number): void {
    this.step = paso;
    this.cerrarPago();
    if (paso === 1 && this.timerInterval) {
      clearInterval(this.timerInterval);
      this.selectedSlot = null;
      this.selectedSlotTemp = null;
    }
  }
}

// Colores de la landing (styles.css): porcelana, tinta, latón y arcilla para errores
const APARIENCIA_PAGO = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#101A2C',
    colorBackground: '#F8FAFB',
    colorText: '#101A2C',
    colorTextSecondary: '#55606E',
    colorTextPlaceholder: '#8A93A0',
    colorDanger: '#B0553C',
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    fontSizeBase: '15px',
    borderRadius: '2px',
    spacingUnit: '4px'
  },
  rules: {
    '.Input': { border: '1px solid rgba(16, 26, 44, 0.14)', boxShadow: 'none' },
    '.Input:hover': { borderColor: '#626C7A' },
    '.Input:focus': { borderColor: '#B1994C', boxShadow: '0 0 0 1px #B1994C' },
    '.Label': { fontSize: '12px', fontWeight: '500', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#55606E' },
    '.Tab': { border: '1px solid rgba(16, 26, 44, 0.14)', boxShadow: 'none' },
    '.Tab--selected': { borderColor: '#101A2C', boxShadow: '0 0 0 1px #101A2C' }
  }
};
