import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatConversation {
  _id: string; // contactId
  ultimoMensaje: any;
  mensajesSinLeer: number;
  contacto: any;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/chats`;

  constructor(private http: HttpClient) {}

  obtenerConversaciones(tipo?: 'Lead' | 'Paciente'): Observable<ChatConversation[]> {
    const params: any = {};
    if (tipo) params.tipo = tipo;
    return this.http.get<ChatConversation[]>(`${this.apiUrl}/conversaciones`, { params });
  }

  obtenerMensajes(contactId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mensajes/${contactId}`);
  }

  enviarMensaje(payload: {
    contactId: string;
    contactType: 'Lead' | 'Paciente';
    body: string;
    type?: string;
    mediaUrl?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/enviar`, payload);
  }
}
