import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Usuario {
  _id?: string;
  usuario: string;
  nombre: string;
  apeP: string;
  apeM?: string;
  telefono: string;
  correo: string;
  tipo: 'Administrador' | 'Recepcionista' | 'Doctor' | 'Especialista';
  especialidad?: string;
  atencion?: 'Dental' | 'Estetica';
  activo?: boolean;
  calendarId?: string;
  colorCalendario?: string;
  idPacientes?: string[];
}

@Injectable({
  providedIn: 'root'
})

export class UserService {
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) { }

  getUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(this.apiUrl);
  }

  getUsuarioById(id: string): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.apiUrl}/${id}`);
  }

  createUsuario(data: Partial<Usuario>): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, data);
  }

  updateUsuario(id: string, data: Partial<Usuario>): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, data);
  }

  deleteUsuario(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  deleteUsuarioWithPassword(usuarioAutenticador: any, password: string, usuarioIdAEliminar: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/usuarios/eliminar-con-password`, {
      usuario: usuarioAutenticador,
      password,
      usuarioIdAEliminar
    });
  }

  assignPatients(doctorId: string, pacienteIds: string[]): Observable<any> {
    return this.http.post(`${environment.apiUrl}/doctores/asignar-pacientes`, { doctorId, pacienteIds });
  }

  // Horarios de Atención
  getHorariosDoctor(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/horarios/doctor/${doctorId}`);
  }

  guardarHorario(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/horarios`, data);
  }

  eliminarHorario(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/horarios/${id}`);
  }
}
