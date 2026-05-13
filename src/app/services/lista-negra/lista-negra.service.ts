import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Paciente } from '../pacientes/pacientes.service';

export interface ListaNegra {
  _id: string;
  paciente: string | Paciente;
  agregadoPor: { _id: string; usuario: string; tipo: string } | null;
  razon: string;
  detalles: string;
  tipo: 'temporal' | 'permanente';
  fechaAgregado: Date;
  
}

@Injectable({
  providedIn: 'root'
})

export class ListaNegraService {
  private apiUrl = `${environment.apiUrl}/lista-negra`;

  constructor(private http: HttpClient) {}

  agregarPaciente(data: { pacienteId: string; razon: string; detalles: string; tipo: string; agregadoPor: string }): Observable<ListaNegra> {
    return this.http.post<ListaNegra>(this.apiUrl, data);
  }

  obtenerPorPaciente(pacienteId: string): Observable<{ enListaNegra: boolean; datos?: ListaNegra }> {
    return this.http.get<{ enListaNegra: boolean; datos?: ListaNegra }>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  removerPaciente(pacienteId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/remover/${pacienteId}`);
  }

  obtenerTodas(): Observable<{ data: ListaNegra[] }> {
    return this.http.get<{ data: ListaNegra[] }>(this.apiUrl);
  }
}
