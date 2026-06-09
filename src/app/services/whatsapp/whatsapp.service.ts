import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private apiUrl = `${environment.apiUrl}/whatsapp`;

  constructor(private http: HttpClient) {}

  obtenerPlantillas(): Observable<any> {
    return this.http.get(`${this.apiUrl}/plantillas`);
  }

  enviarMensajesMasivos(payload: {
    plantilla: string;
    idioma: string;
    contactos: { id: string; tipo: 'paciente' | 'lead' }[];
    mapeo: any;
    multimedia?: { type: 'IMAGE' | 'VIDEO' | 'DOCUMENT', url: string };
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/enviar-masivo`, payload);
  }

  obtenerGaleria(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/galeria`);
  }

  subirImagen(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('foto', file);
    return this.http.post(`${this.apiUrl}/galeria`, formData);
  }
}
