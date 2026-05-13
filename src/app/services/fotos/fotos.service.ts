import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Foto {
  key: string;
  url: string;
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class FotosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  subirFoto(pacienteId: string, archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('foto', archivo);
    return this.http.post(`${this.apiUrl}/pacientes/${pacienteId}/fotos`, formData);
  }

  obtenerFotos(pacienteId: string): Observable<{ fotos: Foto[] }> {
    return this.http.get<{ fotos: Foto[] }>(`${this.apiUrl}/pacientes/${pacienteId}/fotos`);
  }
}