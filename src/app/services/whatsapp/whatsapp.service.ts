import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoEntrega = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MetricasEnvio {
  total: number;
  pendientes: number;
  enviados: number;
  entregados: number;
  leidos: number;
  fallidos: number;
  respondieron?: number;
  vistoSinRespuesta?: number;
}

export interface EnvioMasivo {
  _id: string;
  nombre: string;
  plantilla: string;
  idioma: string;
  mediaUrl?: string;
  total: number;
  omitidos: number;
  createdAt: string;
  metricas: MetricasEnvio;
}

export interface DestinatarioEnvio {
  _id: string;
  contactType: 'Paciente' | 'Lead';
  contactId: string;
  nombre: string;
  telefono: string;
  estado: EstadoEntrega;
  fechaEntrega: string | null;
  fechaLectura: string | null;
  error: string | null;
  respondio: boolean;
  fechaRespuesta: string | null;
}

export interface DetalleEnvio extends EnvioMasivo {
  textoPlantilla: string;
  destinatarios: DestinatarioEnvio[];
}

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
    nombre?: string;
    plantilla: string;
    idioma: string;
    textoPlantilla?: string;
    contactos: { id: string; tipo: 'paciente' | 'lead' }[];
    mapeo: any;
    multimedia?: { type: 'IMAGE' | 'VIDEO' | 'DOCUMENT', url: string };
  }): Observable<{ mensaje: string; envioId: string; total: number; omitidos: number }> {
    return this.http.post<{ mensaje: string; envioId: string; total: number; omitidos: number }>(`${this.apiUrl}/enviar-masivo`, payload);
  }

  obtenerEnvios(): Observable<EnvioMasivo[]> {
    return this.http.get<EnvioMasivo[]>(`${this.apiUrl}/envios`);
  }

  obtenerEnvio(id: string): Observable<DetalleEnvio> {
    return this.http.get<DetalleEnvio>(`${this.apiUrl}/envios/${id}`);
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
