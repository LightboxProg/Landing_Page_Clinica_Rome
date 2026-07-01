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

export interface Intervalo {
  horaInicio: string;
  horaFin: string;
}

export interface DiaConfig {
  diaSemana: number;
  activo: boolean;
  horaInicio?: string;
  horaFin?: string;
  intervalos?: Intervalo[];
}

export interface ConfigDisponibilidad {
  _id?: string;
  nombre?: string;
  doctorId: string;
  modoFechas: 'rango' | 'individual';
  fechaInicio?: string;
  fechaFin?: string;
  fechasSeleccionadas?: string[];
  diasConfig: DiaConfig[];
  servicioId?: any;
  tipoServicio?: 'ServicioDental' | 'ServicioEstetico';
  duracionConsultaMinutos: number;
  descansoEntreConsultasMinutos: number;
  montoAnticipo?: number;
  activo: boolean;
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

  // Horarios de Atencion (legacy, compatibilidad)
  getHorariosDoctor(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/horarios/doctor/${doctorId}`);
  }

  guardarHorario(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/horarios`, data);
  }

  eliminarHorario(id: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/horarios/${id}`);
  }

  // Configuracion de Disponibilidad (nuevo modelo)
  guardarConfigDisponibilidad(data: Partial<ConfigDisponibilidad>): Observable<ConfigDisponibilidad> {
    return this.http.post<ConfigDisponibilidad>(`${environment.apiUrl}/disponibilidad/config`, data);
  }

  obtenerConfigDisponibilidad(doctorId: string): Observable<ConfigDisponibilidad | null> {
    return this.http.get<ConfigDisponibilidad | null>(`${environment.apiUrl}/disponibilidad/config/${doctorId}`);
  }

  obtenerConfigDisponibilidadPorId(configId: string): Observable<ConfigDisponibilidad | null> {
    return this.http.get<ConfigDisponibilidad | null>(`${environment.apiUrl}/disponibilidad/config/id/${configId}`);
  }

  listarConfiguraciones(doctorId: string): Observable<ConfigDisponibilidad[]> {
    return this.http.get<ConfigDisponibilidad[]>(`${environment.apiUrl}/disponibilidad/config/lista/${doctorId}`);
  }

  eliminarConfiguracion(configId: string): Observable<any> {
    return this.http.delete<any>(`${environment.apiUrl}/disponibilidad/config/${configId}`);
  }

  // Generar slots a partir de la config
  configurarDisponibilidad(doctorId: string, configId?: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/disponibilidad/configurar`, { doctorId, configId });
  }

  // Horario Doctor (dentista) - dias y turnos de trabajo
  obtenerHorarioDoctor(doctorId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/horario-doctor/${doctorId}`);
  }

  guardarHorarioDoctor(data: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/horario-doctor`, data);
  }

  // Feriados oficiales de Mexico
  obtenerFeriados(anio: number): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/feriados?anio=${anio}`);
  }
}
