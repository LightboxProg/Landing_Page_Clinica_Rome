import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-calendly-scheduler',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendly-scheduler.component.html',
  styleUrl: './calendly-scheduler.component.css'
})
export class CalendlySchedulerComponent implements OnInit, OnDestroy {
  @Input() doctorId!: string;
  @Input() serviceId!: string;

  fechasDisponibles: Date[] = [];
  fechaSeleccionada: string | null = null;
  slots: any[] = [];
  
  slotApartado: any = null;
  timer: any;
  timeLeft: number = 0; // Segundos

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarFechasProximas();
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  cargarFechasProximas() {
    // Generamos las próximas 2 semanas para el selector inicial
    const hoy = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(hoy.getDate() + i);
      this.fechasDisponibles.push(d);
    }
  }

  seleccionarFecha(fecha: Date) {
    const format = fecha.toISOString().split('T')[0];
    this.fechaSeleccionada = format;
    this.http.get<any[]>(`${environment.apiUrl}/disponibilidad/slots`, {
      params: { doctorId: this.doctorId, fecha: format }
    }).subscribe(data => {
      this.slots = data;
    });
  }

  apartarHorario(slot: any) {
    if (this.slotApartado) return;

    this.http.post(`${environment.apiUrl}/disponibilidad/apartar`, {
      slotId: slot._id,
      identifcadorUsuario: 'WEB_USER' // O ID del paciente logueado
    }).subscribe({
      next: (res: any) => {
        this.slotApartado = res.slot;
        this.iniciarContador();
        Swal.fire({
          title: 'Horario Apartado',
          text: 'Tienes 15 minutos para completar tu pago de anticipo.',
          icon: 'info',
          timer: 3000
        });
      },
      error: (err) => {
        Swal.fire('No disponible', 'Este horario acaba de ser tomado por otra persona.', 'error');
        this.seleccionarFecha(new Date(this.fechaSeleccionada!)); // Recargar slots
      }
    });
  }

  iniciarContador() {
    this.timeLeft = 15 * 60;
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.finalizarTiempo();
      }
    }, 1000);
  }

  formatTimer() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  finalizarTiempo() {
    clearInterval(this.timer);
    this.slotApartado = null;
    Swal.fire('Tiempo expirado', 'El horario ha sido liberado. Por favor, selecciona uno nuevo.', 'warning');
    if (this.fechaSeleccionada) this.seleccionarFecha(new Date(this.fechaSeleccionada));
  }

  procederAlPago() {
    // Aquí se integraría la pasarela (Stripe/PayPal/Conekta)
    // Al finalizar el pago, se llamaría a confirmarReserva en el backend
    Swal.fire('Pago en proceso', 'Redirigiendo a pasarela segura...', 'success');
    
    // Simulación de éxito de pago tras 2 segundos
    setTimeout(() => {
      this.confirmarCita();
    }, 2000);
  }

  confirmarCita() {
    const payload = {
      slotId: this.slotApartado._id,
      pagoReferencia: 'PAY-123456',
      citaData: {
        pacienteNombre: 'Paciente de Prueba',
        pacienteTelefono: '5512345678',
        tipoCita: 'Estetica',
        titulo: 'Cita desde Web'
      }
    };

    this.http.post(`${environment.apiUrl}/reservas/confirmar`, payload).subscribe(() => {
      clearInterval(this.timer);
      this.slotApartado = null;
      Swal.fire('¡Cita Confirmada!', 'Recibirás un mensaje de confirmación por WhatsApp.', 'success');
    });
  }
}
