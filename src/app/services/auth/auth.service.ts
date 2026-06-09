import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface UsuarioAuth {
  id: string;
  usuario: string;
  tipo: string;
  nombre: string;
  apeP: string;
  apeM: string;
  telefono: string;
  especialidad?: string;
  calendarId?: string;
  colorCalendario?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  usuario: UsuarioAuth;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}`;
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  private usuarioSubject = new BehaviorSubject<UsuarioAuth | null>(this.getUsuarioGuardado());
  usuario$ = this.usuarioSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(usuario: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { usuario, password }).pipe(
      tap(response => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(response.usuario));
        this.usuarioSubject.next(response.usuario);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.usuarioSubject.next(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUsuario(): UsuarioAuth | null {
    return this.usuarioSubject.value;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Verificar expiración del token
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const payload = JSON.parse(jsonPayload);
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /** Persiste un token nuevo (por ejemplo tras vincular Google). */
  updateToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /** Persiste datos de usuario actualizados y notifica a los suscriptores. */
  updateUsuario(usuario: UsuarioAuth): void {
    localStorage.setItem(this.userKey, JSON.stringify(usuario));
    this.usuarioSubject.next(usuario);
  }

  private getUsuarioGuardado(): UsuarioAuth | null {
    const stored = localStorage.getItem(this.userKey);
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  }
}
