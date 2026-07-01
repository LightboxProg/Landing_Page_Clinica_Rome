import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export interface Promocion {
  _id?: string;
  nombre: string;
  descripcion?: string;
  servicioId?: any;
  categoriaId?: any;
  tipoDescuento: 'Monto' | 'Porcentaje';
  valorDescuento: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PromocionesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  crearPromocion(promo: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/promociones`, promo);
  }

  obtenerPromociones(): Observable<Promocion[]> {
    return this.http.get<Promocion[]>(`${this.apiUrl}/promociones`);
  }

  eliminarPromocion(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/promociones/${id}`);
  }

  obtenerPrecioSugerido(servicioId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/promociones/calcular`, {
      params: { servicioId }
    });
  }

  obtenerPromocionesActivas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/promociones/activas`);
  }
}
