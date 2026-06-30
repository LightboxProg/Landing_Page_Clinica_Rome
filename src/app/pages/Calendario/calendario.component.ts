import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { CalendarService } from '../../services/calendar/calendar.service';
import { UserService, Usuario } from '../../services/user/user.service';
import { AuthService } from '../../services/auth/auth.service';
import { CalendarSidebarComponent } from '../../components/calendario/calendar-sidebar/calendar-sidebar.component';
import { CalendarEventModalComponent } from '../../components/calendario/calendar-event-modal/calendar-event-modal.component';

@Component({
  selector: 'app-calendario-admin',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, CalendarSidebarComponent, CalendarEventModalComponent],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.css'
})
export class CalendarioAdminComponent implements OnInit {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  doctores: Usuario[] = [];
  doctorIdSeleccionado: string = '';
  isDoctorOrSpecialist: boolean = false;
  
  // Custom Modal State
  isModalOpen: boolean = false;
  selectedEvent: any = null;

  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'timeGridWeek',
    locale: esLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día',
      list: 'Agenda'
    },
    slotMinTime: '08:00:00',
    slotMaxTime: '21:00:00',
    allDaySlot: false,
    nowIndicator: true,
    handleWindowResize: true,
    expandRows: true,
    slotEventOverlap: false,
    editable: false,
    selectable: true,
    eventClick: this.handleEventClick.bind(this),
    datesSet: this.handleDatesSet.bind(this)
  };

  constructor(
    private calendarService: CalendarService,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkRole();
  }

  checkRole() {
    const user = this.authService.getUsuario();
    if (user?.tipo === 'Doctor' || user?.tipo === 'Especialista') {
      this.isDoctorOrSpecialist = true;
      this.doctorIdSeleccionado = user.id;
      // Los doctores solo se cargan a si mismos en el array para el sidebar
      this.doctores = [user as any]; 
    } else {
      this.cargarDoctores();
    }
  }

  cargarDoctores() {
    this.userService.getUsuarios().subscribe(users => {
      this.doctores = users.filter(u => u.tipo === 'Doctor' || u.tipo === 'Especialista');
    });
  }

  handleDatesSet(arg: any) {
    this.cargarEventos(arg.startStr, arg.endStr);
  }

  onDoctorChange() {
    const calendarApi = this.calendarComponent.getApi();
    this.cargarEventos(calendarApi.view.activeStart.toISOString(), calendarApi.view.activeEnd.toISOString());
  }

  cargarEventos(timeMin: string, timeMax: string) {
    this.calendarService.getEventos(timeMin, timeMax, this.doctorIdSeleccionado).subscribe({
      next: (eventos: any[]) => {
        const calendarEvents: EventInput[] = eventos.map(e => ({
          id: e.id,
          title: `${e.pacienteNombre} (${e.servicioNombre})`,
          start: e.start.dateTime,
          end: e.end.dateTime,
          backgroundColor: e.color,
          borderColor: e.color,
          extendedProps: { ...e }
        }));
        this.calendarOptions.events = calendarEvents;
      },
      error: (err) => {
        console.error('Error al cargar eventos:', err);
        this.calendarOptions.events = [];
      }
    });
  }

  handleEventClick(arg: any) {
    this.selectedEvent = arg.event.extendedProps;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    setTimeout(() => this.selectedEvent = null, 300); // Wait for transition
  }
}
