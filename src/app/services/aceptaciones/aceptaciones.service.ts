import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Aceptación de términos para pagos fuera de la página (OXXO, transferencia…)
@Injectable({
  providedIn: 'root'
})
export class AceptacionesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ----- Admin -----
  crear(datos: { concepto: string; metodoPago: string; monto?: number | null; telefonoEnvio?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/aceptaciones`, datos);
  }

  listar(estado = 'todos'): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/aceptaciones`, { params: { estado } });
  }

  eliminar(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/aceptaciones/${id}`);
  }

  // ----- Públicas -----
  ver(codigo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/aceptaciones/publica/${codigo}`);
  }

  aceptar(codigo: string, datos: { lada: string; telefono: string; acepta: boolean }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/aceptaciones/publica/${codigo}`, datos);
  }

  // Enlace público fijo /aceptar (sin código)
  aceptarPublico(datos: { lada: string; telefono: string; acepta: boolean }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/aceptaciones/publica`, datos);
  }
}
