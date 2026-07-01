import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface CitaPayload {
  _id?: string;
  pacienteId?: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteEmail?: string;
  doctorId: string;
  servicioId?: string;
  tipoCita: 'Dental' | 'Estetica';
  titulo: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date;
  estado?: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';
  notas?: string;
  origen?: string;
  googleEventId?: string;
  googleEventLink?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CitasService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  agendarCita(cita: CitaPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/citas/agendar`, cita);
  }

  crearCitaEstetica(cita: CitaPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/citas/agendar`, { ...cita, tipoCita: 'Estetica' });
  }

  crearCitaDental(cita: CitaPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/citas/agendar`, { ...cita, tipoCita: 'Dental' });
  }

  obtenerCitasEsteticaPorPaciente(pacienteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citas-esteticas/paciente/${pacienteId}`);
  }

  obtenerCitasDentalPorPaciente(pacienteId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/citas-dentales/paciente/${pacienteId}`);
  }

  registrarCobro(citaId: string, datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/citas/${citaId}/cobrar`, datos);
  }

  obtenerCorteDiario(fecha?: string): Observable<any> {
    const params: any = {};
    if (fecha) params.fecha = fecha;
    return this.http.get<any>(`${this.apiUrl}/citas/corte-diario`, { params });
  }
}