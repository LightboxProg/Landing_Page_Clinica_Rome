import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type OrigenIA = 'bot' | 'flujo' | 'simulador';

// Montos en USD (lo que cobra Anthropic); la página convierte con tipoCambio
export interface UsoIA {
  mes: string;
  modelo: string;
  activa: boolean;
  tipoCambio: number;
  topes: { porContactoHora: number; diario: number };
  totales: {
    llamadas: number;
    bloqueadas: number;
    errores: number;
    tokensEntrada: number;
    tokensSalida: number;
    costoUSD: number;
  };
  hoy: { llamadas: number; costoUSD: number };
  porDia: { fecha: string; llamadas: number; costoUSD: number }[];
  porOrigen: { origen: OrigenIA; llamadas: number; bloqueadas: number; costoUSD: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class IaService {
  private apiUrl = `${environment.apiUrl}/ia`;

  constructor(private http: HttpClient) {}

  // mes en formato YYYY-MM; sin mes, el actual
  obtenerUso(mes?: string): Observable<UsoIA> {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes);
    return this.http.get<UsoIA>(`${this.apiUrl}/uso`, { params });
  }
}
