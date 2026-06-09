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
    slotMinTime: '08:00:00',
    slotMaxTime: '21:00:00',
    allDaySlot: false,
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
      next: (eventos) => {
        const calendarEvents: EventInput[] = eventos.map(e => ({
          id: e.id,
          title: `${e.medicoNombre}: ${e.summary}`,
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
        if (err.status === 401 && err.error?.message?.includes('vinculado')) {
          // El navbar ya muestra que no está conectado, así que solo dejamos el calendario vacío silenciosamente.
          console.log('Calendario renderizado en modo sin conexión.');
        } else {
          // Solo mostramos error si es un fallo real de red o servidor, no de vinculación.
          Swal.fire({
            title: 'Aviso', 
            text: 'No se pudieron cargar los eventos en este momento.', 
            icon: 'warning',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
        this.calendarOptions.events = []; // Dejar vacío para que la interfaz siga siendo accesible
      }
    });
  }

  handleEventClick(arg: any) {
    const event = arg.event.extendedProps;
    Swal.fire({
      title: event.summary,
      html: `
        <div style="text-align: left;">
          <p><strong>Médico:</strong> ${event.medicoNombre}</p>
          <p><strong>Inicio:</strong> ${new Date(event.start.dateTime).toLocaleString()}</p>
          <p><strong>Fin:</strong> ${new Date(event.end.dateTime).toLocaleString()}</p>
          ${event.description ? `<p><strong>Detalles:</strong> ${event.description}</p>` : ''}
        </div>
      `,
      confirmButtonText: 'Cerrar',
      showCancelButton: true,
      cancelButtonText: 'Ver en Google',
      cancelButtonColor: '#4285f4'
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel) {
        window.open(event.htmlLink, '_blank');
      }
    });
  }
}
