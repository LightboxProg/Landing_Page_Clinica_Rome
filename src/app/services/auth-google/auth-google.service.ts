import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GoogleStatusResponse {
  isLinked: boolean;
  updatedAt: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthGoogleService {
  private apiUrl = `${environment.apiUrl}/google`;

  constructor(private http: HttpClient) { }

  getAuthUrl(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/auth-url`);
  }

  confirmCallback(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/callback`, { code });
  }

  getStatus(): Observable<GoogleStatusResponse> {
    return this.http.get<GoogleStatusResponse>(`${this.apiUrl}/status`);
  }
}
