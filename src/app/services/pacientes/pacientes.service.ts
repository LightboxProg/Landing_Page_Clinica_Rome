import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private apiUrl = `${environment.apiUrl}/pacientes`;

  constructor(private http: HttpClient) { }

  buscarPorTelefono(telefono: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/telefono/${telefono}`);
  }

  crearPaciente(paciente: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crear`, paciente);
  }

  obtenerPacientes(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/pacientes`);
  }
}
