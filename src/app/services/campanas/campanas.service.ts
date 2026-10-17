import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CanalCampana = 'WhatsApp' | 'Instagram';
export type DisparadorCampana = 'palabra_clave' | 'comentario' | 'enlace';
export type EstadoCampana = 'Borrador' | 'Activa' | 'Pausada' | 'Finalizada';

export interface MetricasCampana {
  inscritos: number;
  disparos: number;
  nuevos: number;
  conversiones: number;
}

export interface Campana {
  _id?: string;
  nombre: string;
  descripcion: string;
  canal: CanalCampana;
  disparador: DisparadorCampana;
  palabrasClave: string[];
  coincidencia: 'contiene' | 'exacta';
  publicacionId: string;
  codigo?: string;
  mensajeEnlace: string;
  respuesta: { mensaje: string; mediaUrl: string };
  respuestaComentario: string;
  etiquetas: string[];
  interes: 'Dental' | 'Estetica' | 'Ambos' | 'Desconocido';
  idDoctor?: string | null;
  estado: EstadoCampana;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  enlace?: string | null;
  metricas?: MetricasCampana;
  createdAt?: string;
}

export interface RegistroCampana {
  _id: string;
  lead: { _id: string; nombre: string; identificador: string; estado: string } | null;
  canal: CanalCampana;
  identificador: string;
  textoEntrada: string;
  esNuevo: boolean;
  disparos: number;
  ultimoDisparo: string;
  convertido: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CampanasService {
  private apiUrl = `${environment.apiUrl}/campanas`;

  constructor(private http: HttpClient) {}

  obtenerCampanas(filtros: { canal?: string; estado?: string } = {}): Observable<Campana[]> {
    let params = new HttpParams();
    if (filtros.canal) params = params.set('canal', filtros.canal);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    return this.http.get<Campana[]>(this.apiUrl, { params });
  }

  obtenerCampana(id: string): Observable<Campana> {
    return this.http.get<Campana>(`${this.apiUrl}/${id}`);
  }

  crearCampana(campana: Partial<Campana>): Observable<Campana> {
    return this.http.post<Campana>(this.apiUrl, campana);
  }

  actualizarCampana(id: string, campana: Partial<Campana>): Observable<Campana> {
    return this.http.put<Campana>(`${this.apiUrl}/${id}`, campana);
  }

  cambiarEstado(id: string, estado: EstadoCampana): Observable<Campana> {
    return this.http.put<Campana>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  eliminarCampana(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  obtenerRegistros(id: string): Observable<RegistroCampana[]> {
    return this.http.get<RegistroCampana[]>(`${this.apiUrl}/${id}/registros`);
  }
}
