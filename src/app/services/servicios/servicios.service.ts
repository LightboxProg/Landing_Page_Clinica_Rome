import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServiciosService {

  private apiUrl = `${environment.apiUrl}/servicios`;

  constructor(private http: HttpClient) { }

  obtenerServicios(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  obtenerServicioPorId(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Envía FormData para soportar fotos y audio vía multer
  crearServicio(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData);
  }

  modificarServicio(id: string, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData);
  }

  eliminarServicio(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
