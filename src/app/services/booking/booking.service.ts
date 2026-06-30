import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DoctorPublic {
  _id: string;
  nombre: string;
  apeP: string;
  apeM?: string;
  colorCalendario: string;
  especialidad: string;
  atencion: 'Dental' | 'Estetica';
}

export interface SlotPublic {
  _id: string;
  doctorId: any;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Busca un paciente por su número telefónico
  buscarPacientePorTelefono(telefono: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/pacientes/telefono/${telefono}`);
  }

  // Registra un nuevo paciente desde la pasarela pública
  crearPaciente(paciente: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/pacientes/crear`, paciente);
  }

  // Obtiene el listado público de doctores activos
  obtenerDoctoresPublicos(): Observable<DoctorPublic[]> {
    return this.http.get<DoctorPublic[]>(`${this.apiUrl}/doctores/publico`);
  }

  // Obtiene los slots libres de un doctor en una fecha específica
  obtenerSlots(doctorId: string, fecha: string, configId?: string): Observable<SlotPublic[]> {
    const params: any = { doctorId, fecha };
    if (configId) {
      params.configId = configId;
    }
    return this.http.get<SlotPublic[]>(`${this.apiUrl}/disponibilidad/slots`, { params });
  }

  // Obtiene las fechas únicas que tienen disponibilidad
  obtenerFechasDisponibles(doctorId: string, configId?: string): Observable<string[]> {
    const params: any = { doctorId };
    if (configId) {
      params.configId = configId;
    }
    return this.http.get<string[]>(`${this.apiUrl}/disponibilidad/fechas-disponibles`, { params });
  }

  // Obtiene la configuracion activa de disponibilidad de un doctor de forma publica
  obtenerConfigDisponibilidad(doctorId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/disponibilidad/config/${doctorId}`);
  }

  // Obtiene una configuracion especifica de forma publica por su ID
  obtenerConfigDisponibilidadPorId(configId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/disponibilidad/config/id/${configId}`);
  }

  // Realiza el apartado temporal de un slot por 10 minutos
  apartarSlot(slotId: string, pacienteId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/disponibilidad/apartar`, {
      slotId,
      identifcadorUsuario: pacienteId
    });
  }

  // Crea una sesión de Stripe Checkout para pagar el anticipo de la cita
  crearCheckoutSesionCita(slotId: string, pacienteId: string, tipoCita: string, servicioId?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reservas/checkout`, {
      slotId,
      pacienteId,
      tipoCita,
      servicioId
    });
  }

  // Verifica la sesión de checkout pagada y confirma la cita localmente y en Google Calendar
  verificarCitaCheckoutSession(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reservas/verificar-session/${sessionId}`);
  }
}
