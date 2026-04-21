import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MembresiasService {

  private apiUrl = `${environment.apiUrl}/membresias`;

  constructor(private http: HttpClient) {}

  // Catálogos
  obtenerCatalogos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogos`);
  }

  // Envía FormData para soportar foto vía multer
  crearCatalogo(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/catalogos`, formData);
  }

  actualizarCatalogo(id: string, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/catalogos/${id}`, formData);
  }

  eliminarCatalogo(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/catalogos/${id}`);
  }

  // Checkout
  iniciarCheckout(membresiaId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/checkout`, { membresiaId });
  }
}
