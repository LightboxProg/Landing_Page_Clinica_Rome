import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EstadoServicio {
  ok: boolean;
  detalle: string;
}

export interface EstadoJob {
  nombre: string;
  corridas: number;
  errores: number;
  ultimaCorrida: string | null;
  duracionMs: number;
  ultimoError: { fecha: string; mensaje: string } | null;
}

export interface SaludSistema {
  servidor: { ok: boolean; desde: string; node: string };
  baseDeDatos: EstadoServicio;
  bot: EstadoServicio;
  stripe: EstadoServicio;
  jobs: EstadoJob[];
  configuracion: { clave: string; para: string; puesta: boolean }[];
}

export interface ErrorRegistro {
  _id: string;
  origen: string;
  mensaje: string;
  stack: string;
  ruta: string;
  status?: number;
  usuario: string;
  contexto: Record<string, unknown>;
  veces: number;
  primeraVez: string;
  ultimaVez: string;
  revisado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SistemaService {
  private apiUrl = `${environment.apiUrl}/sistema`;

  constructor(private http: HttpClient) {}

  obtenerSalud(): Observable<SaludSistema> {
    return this.http.get<SaludSistema>(`${this.apiUrl}/salud`);
  }

  obtenerErrores(pendientes = false): Observable<ErrorRegistro[]> {
    const params = pendientes ? new HttpParams().set('pendientes', '1') : undefined;
    return this.http.get<ErrorRegistro[]>(`${this.apiUrl}/errores`, { params });
  }

  contarRecientes(): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${this.apiUrl}/errores/recientes`);
  }

  marcarRevisado(id: string | 'todos'): Observable<{ actualizados: number }> {
    return this.http.put<{ actualizados: number }>(`${this.apiUrl}/errores/${id}/revisado`, {});
  }
}
