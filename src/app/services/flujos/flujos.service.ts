import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CanalCampana, EstadoCampana } from '../campanas/campanas.service';

export type TipoNodo = 'mensaje' | 'pregunta' | 'capturar' | 'condicion' | 'espera' | 'agendar_pagar' | 'fin';

export interface RamaPregunta {
  id: string;
  etiqueta: string;
  // Intención del bot que también elige esta rama (ej. "afirmar" para un "sí")
  intencion: string;
  ejemplos: string[];
}

export interface NodoFlujo {
  id: string;
  tipo: TipoNodo;
  posicion: { x: number; y: number };
  // Lo que configura cada tipo; ver Backend/models/Flujo.js
  datos: any;
}

export interface ConexionFlujo {
  desde: string;
  salida: string;
  hacia: string;
}

export interface Flujo {
  _id?: string;
  nombre: string;
  descripcion: string;
  canales: CanalCampana[];
  estado: 'Borrador' | 'Activo';
  nodoInicio: string;
  nodos: NodoFlujo[];
  conexiones: ConexionFlujo[];
  campanas?: { _id: string; nombre: string; estado: EstadoCampana }[];
  updatedAt?: string;
}

// Lo que el bot respondería: el mismo formato de acciones que manda a Meta
export interface AccionBot {
  tipo: 'texto' | 'opciones' | 'imagen' | 'audio';
  texto?: string;
  mediaUrl?: string;
  opciones?: { id: string; titulo: string }[];
}

export interface ResultadoSimulacion {
  acciones: AccionBot[];
  // Se regresa tal cual en el siguiente turno
  estado: any;
  terminado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FlujosService {
  private apiUrl = `${environment.apiUrl}/flujos`;

  constructor(private http: HttpClient) {}

  obtenerFlujos(): Observable<Flujo[]> {
    return this.http.get<Flujo[]>(this.apiUrl);
  }

  obtenerFlujo(id: string): Observable<Flujo> {
    return this.http.get<Flujo>(`${this.apiUrl}/${id}`);
  }

  crearFlujo(flujo: Partial<Flujo>): Observable<Flujo> {
    return this.http.post<Flujo>(this.apiUrl, flujo);
  }

  actualizarFlujo(id: string, flujo: Partial<Flujo>): Observable<Flujo> {
    return this.http.put<Flujo>(`${this.apiUrl}/${id}`, flujo);
  }

  eliminarFlujo(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Imagen o audio para un bloque de mensaje
  subirMedia(archivo: File): Observable<{ url: string; mediaTipo: 'imagen' | 'audio' }> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<{ url: string; mediaTipo: 'imagen' | 'audio' }>(`${this.apiUrl}/media`, datos);
  }

  simular(payload: { flujo: Partial<Flujo>; canal: CanalCampana; estado: any; texto?: string; opcionId?: string | null }): Observable<ResultadoSimulacion> {
    return this.http.post<ResultadoSimulacion>(`${this.apiUrl}/simular`, payload);
  }
}
