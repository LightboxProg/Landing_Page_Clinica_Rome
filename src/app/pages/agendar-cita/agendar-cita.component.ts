import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService, DoctorPublic, SlotPublic } from '../../services/booking/booking.service';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { ServiciosDentalesService } from '../../services/servicios-dentales/servicios-dentales.service';

@Component({
  selector: 'app-agendar-cita',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  timeLeft: number = 900; // 15 minutos en segundos
  timerInterval: any = null;
  formattedTime: string = '15:00';

  constructor(
    private bookingService: BookingService,
    private route: ActivatedRoute,
    private serviciosService: ServiciosService,
    private serviciosDentalesService: ServiciosDentalesService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.hasUrlDoctor = !!params['doctor'] || !!params['config'];
    });
    this.cargarDoctores();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // Importe que realmente se cobrará ahora. Refleja exactamente la lógica
  // del backend (checkout.controller): si la configuración de disponibilidad
  // define un anticipo, ese manda sobre el costo del servicio.
  get montoApartado(): number {
    const anticipo = this.activeConfig?.montoAnticipo;
    if (anticipo !== undefined && anticipo !== null) return Number(anticipo);
    return this.selectedService?.costo ?? 500;
  }

  // ¿El apartado es menor que el tratamiento? Entonces sí es un anticipo.
  get apartadoEsParcial(): boolean {
    return !!this.selectedService && this.montoApartado < this.selectedService.costo;
  }

  formatearPrecio(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor ?? 0);
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
    if (!this.nuevoPaciente.nombre || !this.nuevoPaciente.apeP || !this.nuevoPaciente.apeM) {
      this.errorMessage = 'Los campos nombre, primer y segundo apellido son obligatorios.';
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
    this.bookingService.apartarSlot(this.selectedSlotTemp._id, pacienteId).subscribe({
      next: (res) => {
        this.selectedSlot = this.selectedSlotTemp;
        this.loading = false;
        this.step = 4; // Ir a pago
        this.iniciarCronometro();
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

  cargarFechasDisponibles(): void {
    if (!this.selectedDoctorId) return;
    this.bookingService.obtenerFechasDisponibles(this.selectedDoctorId, this.selectedConfigId).subscribe({
      next: (fechas) => {
        this.fechasDisponibles = fechas || [];
        if (this.fechasDisponibles.length > 0) {
          if (!this.selectedFecha || !this.fechasDisponibles.includes(this.selectedFecha)) {
            this.selectedFecha = this.fechasDisponibles[0];
            this.onDoctorOrFechaChange();
          }
        }
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
      this.bookingService.obtenerSlots(this.selectedDoctorId, this.selectedFecha, this.selectedConfigId).subscribe({
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

  // Guarda la selección temporal del slot y avanza al login/teléfono
  seleccionarSlot(slot: SlotPublic): void {
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
        this.selectedSlot = null;
        this.selectedSlotTemp = null;
        this.step = 1;
        this.errorMessage = 'El tiempo de reserva (15 minutos) ha expirado. Selecciona otro horario.';
      }
    }, 1000);
  }

  // Redirecciona a Stripe Checkout para pagar el anticipo
  pagarAnticipo(): void {
    if (!this.selectedSlot || !this.paciente || !this.selectedServiceId) return;
    this.loading = true;
    this.errorMessage = '';
    this.bookingService.crearCheckoutSesionCita(
      this.selectedSlot._id,
      this.paciente._id,
      this.selectedTipoCita,
      this.selectedServiceId
    ).subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: (err) => {
        this.errorMessage = 'Ocurrió un error al iniciar la pasarela de pago.';
        this.loading = false;
      }
    });
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
    if (paso === 1 && this.timerInterval) {
      clearInterval(this.timerInterval);
      this.selectedSlot = null;
      this.selectedSlotTemp = null;
    }
  }
}
