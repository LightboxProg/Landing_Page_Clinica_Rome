import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Paciente {
  _id?: string;
  nombre: string;
  apeP: string;
  apeM: string;
  apodo?: string;
  telefonoWhatsapp: string;
  telefonoPaciente?: string;
  correoElectronico: string;
  genero: 'H' | 'M' | 'Otro';
  fechaNac: Date | string;
  altura?: number;
  peso?: number;
  direccion?: string;
  medicamentos?: string;
  alergias?: string;
  enListaNegra: boolean;
  finado: boolean;
  fechaFallecimiento?: Date;
  instagramId?: string;
  stripeCustomerId?: string;
}

@Injectable({
  providedIn: 'root'
})

export class PacientesService {
  private apiUrl = `${environment.apiUrl}/pacientes`;
  private pacientesSubject = new BehaviorSubject<Paciente[]>([]);
  public pacientes$ = this.pacientesSubject.asObservable();

  constructor(private http: HttpClient) {}

  obtenerPacientes(): void {
    this.http.get<Paciente[]>(this.apiUrl).subscribe({
      next: (data) => this.pacientesSubject.next(data),
      error: () => this.pacientesSubject.next([])
    });
  }

  actualizarLista(pacientes: Paciente[]): void {
    this.pacientesSubject.next(pacientes);
  }

  crearPaciente(paciente: Paciente): Observable<Paciente> {
    return this.http.post<Paciente>(`${environment.apiUrl}/pacientes/crear`, paciente);
  }

  getPacienteById(id: string): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.apiUrl}/${id}`);
  }

  actualizarPaciente(id: string, data: Partial<Paciente>): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.apiUrl}/${id}`, data);
  }

  eliminarPaciente(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  buscarPorTelefono(telefono: string): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(`${environment.apiUrl}/pacientes/telefono/${telefono}`);
  }

  guardarAlergias(id: string, alergias: string): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.apiUrl}/${id}/alergias`, { alergias });
  }

  guardarMedicamentos(id: string, medicamentos: string): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.apiUrl}/${id}/medicamentos`, { medicamentos });
  }
}