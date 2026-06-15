import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessageComponent } from '../chat-message/chat-message.component';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService, Usuario } from '../../../services/user/user.service';
import { ServiciosService } from '../../../services/servicios/servicios.service';
import { ServiciosDentalesService } from '../../../services/servicios-dentales/servicios-dentales.service';
import { CitasService } from '../../../services/citas/citas.service';
import { CalendarService } from '../../../services/calendar/calendar.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatMessageComponent],
  templateUrl: './chat-window.component.html',
  styleUrl: './chat-window.component.css'
})
export class ChatWindowComponent implements OnInit {
  @Input() conversacionActiva: any = null;
  @Input() mensajes: any[] = [];
  @Input() nuevoMensaje: string = '';
  isTyping: boolean = false;

  // Scheduling Flow State
  isScheduling: boolean = false;
  schedulingStep: number = 1;
  selectedType: 'Dental' | 'Estetica' | null = null;
  selectedService: any = null;
  selectedDoctor: Usuario | null = null;
  selectedDate: string = '';
  selectedTime: string = '';

  // Data for flow
  services: any[] = [];
  doctors: Usuario[] = [];
  doctorAvailability: any[] = [];
  availableTimes: string[] = [];
  occupiedEvents: any[] = []; // Nueva variable para mostrar bloqueos
  isLoadingAvailability = false;

  @Output() mensajeEnviado = new EventEmitter<string>();
  @Output() cerrarChat = new EventEmitter<void>();
  @Output() nuevoMensajeChange = new EventEmitter<string>();
  @Output() verExpediente = new EventEmitter<any>();
  @Output() agregarNota = new EventEmitter<any>();

  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private serviciosEsteticos: ServiciosService,
    private serviciosDentales: ServiciosDentalesService,
    private citasService: CitasService,
    private calendarService: CalendarService
  ) {}

  ngOnInit() {
    this.checkUserRole();
  }

  checkUserRole() {
    const user = this.authService.getUsuario();
    if (user?.tipo === 'Doctor' || user?.tipo === 'Especialista') {
      this.selectedDoctor = user as any;
      this.selectedType = user.atencion === 'Dental' ? 'Dental' : 'Estetica';
    }
  }

  startScheduling() {
    this.isScheduling = true;
    this.schedulingStep = 1;
    this.checkUserRole();
    if (this.selectedDoctor) {
      this.selectType(this.selectedType!);
    }
  }

  cancelScheduling() {
    this.isScheduling = false;
    this.resetFlow();
  }

  resetFlow() {
    this.schedulingStep = 1;
    this.selectedType = null;
    this.selectedService = null;
    this.selectedDoctor = (this.authService.getUsuario()?.tipo === 'Doctor' || this.authService.getUsuario()?.tipo === 'Especialista') ? this.authService.getUsuario() as any : null;
    this.selectedDate = '';
    this.selectedTime = '';
    this.services = [];
    this.availableTimes = [];
    this.occupiedEvents = [];
  }

  selectType(type: 'Dental' | 'Estetica') {
    this.selectedType = type;
    this.schedulingStep = 2;
    if (type === 'Dental') {
      this.serviciosDentales.obtenerServicios().subscribe(data => this.services = data);
    } else {
      this.serviciosEsteticos.obtenerServicios().subscribe(data => this.services = data);
    }
  }

  selectService(service: any) {
    this.selectedService = service;
    const currentUser = this.authService.getUsuario();
    if (currentUser?.tipo === 'Doctor' || currentUser?.tipo === 'Especialista') {
      this.selectedDoctor = currentUser as any;
      this.loadDoctorAvailability();
    } else {
      this.schedulingStep = 3;
      this.userService.getUsuarios().subscribe(users => {
        this.doctors = users.filter(u => 
          (u.tipo === 'Doctor' || u.tipo === 'Especialista') && 
          u.atencion === this.selectedType
        );
      });
    }
  }

  selectDoctor(doctor: Usuario) {
    this.selectedDoctor = doctor;
    this.loadDoctorAvailability();
  }

  loadDoctorAvailability() {
    if (!this.selectedDoctor?._id) return;
    this.isLoadingAvailability = true;
    this.userService.getHorariosDoctor(this.selectedDoctor._id).subscribe(horarios => {
      this.doctorAvailability = horarios;
      this.schedulingStep = 4;
      this.isLoadingAvailability = false;
    });
  }

  onDateChange() {
    if (!this.selectedDate || !this.selectedDoctor) return;

    const [year, month, day] = this.selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); 
    
    const dayConfig = this.doctorAvailability.find(h => h.diaSemana === dayOfWeek);
    if (!dayConfig || !dayConfig.activo) {
      this.availableTimes = [];
      this.occupiedEvents = [];
      return;
    }

    const slots = this.generateSlots(dayConfig.horaInicio, dayConfig.horaFin);
    
    if (this.selectedDoctor.calendarId) {
      this.isLoadingAvailability = true;
      const timeMin = new Date(year, month - 1, day, 0, 0, 0).toISOString();
      const timeMax = new Date(year, month - 1, day, 23, 59, 59).toISOString();
      
      this.calendarService.getEventosPorCalendarId(this.selectedDoctor.calendarId, timeMin, timeMax).subscribe(events => {
        this.occupiedEvents = events; // Guardamos para mostrar visualmente
        this.availableTimes = slots.filter(slot => {
          const [hour, min] = slot.split(':').map(Number);
          const slotStart = new Date(year, month - 1, day, hour, min);
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
          
          return !events.some(e => {
            const eventStart = new Date(e.start.dateTime || e.start.date);
            const eventEnd = new Date(e.end.dateTime || e.end.date);
            return (slotStart < eventEnd && slotEnd > eventStart);
          });
        });
        this.isLoadingAvailability = false;
      });
    } else {
      this.availableTimes = slots;
      this.occupiedEvents = [];
    }
  }

  generateSlots(start: string, end: string): string[] {
    const slots = [];
    let current = parseInt(start.split(':')[0]);
    const endHour = parseInt(end.split(':')[0]);
    
    while (current < endHour) {
      slots.push(`${current.toString().padStart(2, '0')}:00`);
      current++;
    }
    return slots;
  }

  confirmBooking() {
    if (!this.selectedDate || !this.selectedTime) return;

    const fechaInicio = new Date(`${this.selectedDate}T${this.selectedTime}:00`);
    const fechaFin = new Date(fechaInicio.getTime() + 3600000); 

    const citaData: any = {
      pacienteNombre: this.getNombreContacto(this.conversacionActiva),
      pacienteTelefono: this.conversacionActiva.contacto?.telefonoPaciente?.toString() || '',
      pacienteEmail: this.conversacionActiva.contacto?.correoElectronico || '',
      doctorId: this.selectedDoctor?._id,
      titulo: `${this.selectedService.nombre} - ${this.getNombreContacto(this.conversacionActiva)}`,
      fechaHoraInicio: fechaInicio,
      fechaHoraFin: fechaFin,
      estado: 'Pendiente'
    };

    const request: any = this.selectedType === 'Dental' 
      ? this.citasService.crearCitaDental({ ...citaData, servicioDentalId: this.selectedService._id })
      : this.citasService.crearCitaEstetica({ ...citaData, servicioEsteticoId: this.selectedService._id });

    request.subscribe({
      next: () => {
        Swal.fire('¡Éxito!', 'Cita agendada correctamente', 'success');
        this.cancelScheduling();
      },
      error: (err: any) => {
        Swal.fire('Error', 'No se pudo agendar la cita', 'error');
        console.error(err);
      }
    });
  }

  onMensajeChange(val: string) {
    this.nuevoMensajeChange.emit(val);
  }

  enviar() {
    if (!this.nuevoMensaje.trim()) return;
    this.mensajeEnviado.emit(this.nuevoMensaje);
  }

  getNombreContacto(conv: any): string {
    if (!conv || !conv.contacto) return 'Desconocido';
    const contacto = conv.contacto;
    if (this.conversacionActiva?.ultimoMensaje?.contactType === 'Lead' || conv.ultimoMensaje?.contactType === 'Lead') {
      return contacto.nombre || 'Prospecto';
    } else {
      return `${contacto.nombre || ''} ${contacto.apeP || ''}`.trim();
    }
  }

  // Helpers para la UI de Calendario
  formatHour(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getTimeline() {
    // Generar todas las horas de 08:00 a 20:00 para la vista de calendario
    const hours = [];
    for (let i = 8; i <= 20; i++) {
      hours.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return hours;
  }

  isOccupied(hour: string) {
    if (!this.selectedDate) return false;
    const [h, m] = hour.split(':').map(Number);
    const slotStart = new Date(this.selectedDate + `T${hour}:00`);
    const slotEnd = new Date(slotStart.getTime() + 59 * 60 * 1000);

    return this.occupiedEvents.some(e => {
      const eventStart = new Date(e.start.dateTime || e.start.date);
      const eventEnd = new Date(e.end.dateTime || e.end.date);
      return (slotStart < eventEnd && slotEnd > eventStart);
    });
  }
}
