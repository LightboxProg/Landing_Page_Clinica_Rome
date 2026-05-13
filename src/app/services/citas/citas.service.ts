import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export interface CitaEstetica {
  _id?: string;
  pacienteId?: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteEmail: string;
  doctorId: string;
  servicioEsteticoId?: string;
  titulo: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date;
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';
  notas?: string;
  googleEventId?: string;
  googleEventLink?: string;
}

export interface CitaDental {
  _id?: string;
  pacienteId?: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  pacienteEmail: string;
  doctorId: string;
  servicioDentalId?: string;
  titulo: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date;
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada' | 'Completada';
  notas?: string;
  googleEventId?: string;
  googleEventLink?: string;
}

@Injectable({
  providedIn: 'root'
})

export class CitasService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Estética
  crearCitaEstetica(cita: CitaEstetica): Observable<CitaEstetica> {
    return this.http.post<CitaEstetica>(`${this.apiUrl}/calendar/crear-cita-estetica`, cita);
  }
  obtenerCitasEsteticaPorPaciente(pacienteId: string): Observable<CitaEstetica[]> {
    return this.http.get<CitaEstetica[]>(`${this.apiUrl}/citas-esteticas/paciente/${pacienteId}`);
  }

  // Dental
  crearCitaDental(cita: CitaDental): Observable<CitaDental> {
    return this.http.post<CitaDental>(`${this.apiUrl}/calendar/crear-cita-dental`, cita);
  }
  obtenerCitasDentalPorPaciente(pacienteId: string): Observable<CitaDental[]> {
    return this.http.get<CitaDental[]>(`${this.apiUrl}/citas-dentales/paciente/${pacienteId}`);
  }
}