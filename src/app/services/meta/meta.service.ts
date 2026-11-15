import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Cuenta de Instagram conectada con "Iniciar sesión con Facebook" (token de página que no vence)
export interface EstadoMeta {
  conectado: boolean;
  configurado: boolean;
  faltantes: string[];
  pagina?: { id: string; nombre: string } | null;
  instagram?: { id: string; usuario: string | null; foto: string | null } | null;
  paginas: { id: string; nombre: string; instagramUsuario: string | null }[];
  usuarioFacebook?: { id: string; nombre: string } | null;
  conectadoPor?: { id: string; usuario: string } | null;
  conectadoEn?: string;
  suscrita?: boolean;
  aviso?: string | null;
  // valido: null cuando no se pudo preguntar a Meta; vence: null = no vence
  token?: { valido: boolean | null; vence: string | null; motivo: string | null } | null;
}

@Injectable({
  providedIn: 'root'
})
export class MetaService {
  private apiUrl = `${environment.apiUrl}/meta`;

  constructor(private http: HttpClient) { }

  getEstado(): Observable<EstadoMeta> {
    return this.http.get<EstadoMeta>(`${this.apiUrl}/estado`);
  }

  getAuthUrl(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/auth-url`);
  }

  elegirPagina(paginaId: string): Observable<EstadoMeta> {
    return this.http.put<EstadoMeta>(`${this.apiUrl}/pagina`, { paginaId });
  }

  desconectar(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/conexion`);
  }
}
