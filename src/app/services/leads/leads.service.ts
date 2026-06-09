import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Lead {
  _id?: string;
  identificador: string;
  nombre: string;
  origen: 'WhatsApp' | 'Instagram' | 'Facebook' | 'Otro';
  estado: 'Nuevo' | 'Atendido' | 'Preguntón' | 'Convertido' | 'Lista Negra';
  interacciones: number;
  interes: 'Dental' | 'Estética' | 'Ambos' | 'Desconocido';
  notas: string;
  ultimoContacto: Date;
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LeadsService {
  private apiUrl = `${environment.apiUrl}/leads`;

  constructor(private http: HttpClient) { }

  getLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(this.apiUrl);
  }

  crearOActualizarLead(leadData: Partial<Lead>): Observable<any> {
    return this.http.post(this.apiUrl, leadData);
  }

  cambiarEstado(id: string, estado: string): Observable<Lead> {
    return this.http.put<Lead>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  convertirAPaciente(leadId: string, pacienteData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/convertir`, { leadId, pacienteData });
  }
}
