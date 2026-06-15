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
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-calendario-admin',
  standalone: true,
  imports: [CommonModule, FullCalendarModule, FormsModule],
  templateUrl: './calendario.component.html',
  styleUrl: './calendario.component.scss'
})
export class CalendarioAdminComponent implements OnInit {
  @ViewChild('calendar') calendarComponent!: FullCalendarComponent;

  doctores: Usuario[] = [];
  doctorIdSeleccionado: string = '';
  
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
    private userService: UserService
  ) {}

  ngOnInit() {
    this.cargarDoctores();
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
    const event = arg.event.extendedProps;
    const whatsappUrl = `https://wa.me/${event.pacienteTelefono}`;

    Swal.fire({
      title: event.pacienteNombre,
      html: `
        <div class="swal-calendar-info">
          <div class="info-row"><strong>Médico:</strong> ${event.medicoNombre}</div>
          <div class="info-row"><strong>Servicio:</strong> ${event.servicioNombre}</div>
          <div class="info-row"><strong>Tipo:</strong> ${event.tipoCita}</div>
          <div class="info-row"><strong>Paciente:</strong> ${event.esPaciente ? '✅ Registrado' : '👤 Prospecto (Preguntón)'}</div>
          <div class="info-row"><strong>Tel:</strong> ${event.pacienteTelefono || 'N/A'}</div>
          ${event.description ? `<div class="info-details"><strong>Notas:</strong><br>${event.description}</div>` : ''}
        </div>
      `,
      showCancelButton: true,
      showDenyButton: !!event.pacienteTelefono,
      confirmButtonText: 'Cerrar',
      denyButtonText: 'Mandar WhatsApp',
      cancelButtonText: 'Google Calendar',
      confirmButtonColor: '#1a2b3c',
      denyButtonColor: '#25D366',
      cancelButtonColor: '#4285f4'
    }).then((result) => {
      if (result.isDenied) {
        window.open(whatsappUrl, '_blank');
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        window.open(event.htmlLink, '_blank');
      }
    });
  }
}
