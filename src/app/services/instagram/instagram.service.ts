import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoPublicacion = 'imagen' | 'carrusel' | 'reel' | 'historia';
export type EstadoPublicacion = 'publicando' | 'publicada' | 'error';

export interface CuentaInstagram {
  usuario: string;
  tipoCuenta: string;
  foto?: string;
  publicacionesUsadas: number;
  publicacionesPermitidas: number;
}

export interface PublicacionInstagram {
  _id: string;
  tipo: TipoPublicacion;
  caption: string;
  medios: { url: string; tipo: 'imagen' | 'video' }[];
  estado: EstadoPublicacion;
  mediaId?: string;
  permalink?: string;
  error?: string;
  simulada?: boolean;
  creadoPor?: { nombre: string; apeP?: string } | null;
  createdAt: string;
  publicadaEn?: string;
}

export interface MedioInstagram {
  id: string;
  caption: string;
  tipo: 'imagen' | 'carrusel' | 'video' | 'reel';
  miniatura: string | null;
  permalink: string | null;
  fecha: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class InstagramService {
  private apiUrl = `${environment.apiUrl}/instagram`;

  constructor(private http: HttpClient) {}

  obtenerCuenta(): Observable<CuentaInstagram> {
    return this.http.get<CuentaInstagram>(`${this.apiUrl}/cuenta`);
  }

  obtenerPublicaciones(): Observable<PublicacionInstagram[]> {
    return this.http.get<PublicacionInstagram[]>(`${this.apiUrl}/publicaciones`);
  }

  // Publicaciones que ya están en la cuenta (las más recientes primero)
  listarMedios(despues?: string): Observable<{ medios: MedioInstagram[]; siguiente: string | null }> {
    const params: Record<string, string> = { limite: '24' };
    if (despues) params['despues'] = despues;
    return this.http.get<{ medios: MedioInstagram[]; siguiente: string | null }>(`${this.apiUrl}/medios`, { params });
  }

  obtenerMedio(id: string): Observable<MedioInstagram> {
    return this.http.get<MedioInstagram>(`${this.apiUrl}/medios/${encodeURIComponent(id)}`);
  }

  // Responde en cuanto el backend recibe los archivos; la publicación sigue en segundo plano
  publicar(tipo: TipoPublicacion, archivos: File[], caption: string): Observable<PublicacionInstagram> {
    const datos = new FormData();
    datos.append('tipo', tipo);
    datos.append('caption', caption);
    archivos.forEach(archivo => datos.append('medios', archivo));
    return this.http.post<PublicacionInstagram>(`${this.apiUrl}/publicaciones`, datos);
  }
}
