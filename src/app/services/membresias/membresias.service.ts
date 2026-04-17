import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
  export class MembresiasService {

    // Asignamos la ruta que configuramos en landing_back
    private apiUrl = `http://localhost:7001/api/membresias`;
    private checkoutUrl = `http://localhost:7001/api/checkout/session`;

    constructor(private http: HttpClient) { }

    obtenerCatalogos(): Observable<any> {
      return this.http.get<any>(this.apiUrl);
    }

    iniciarCheckout(membresiaId: string): Observable<any> {
      return this.http.post<any>(this.checkoutUrl, { membresiaId });
    }
  }
