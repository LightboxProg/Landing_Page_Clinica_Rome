import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  medicoId: string;
  medicoNombre: string;
  color: string;
  htmlLink: string;
}

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private apiUrl = `${environment.apiUrl}/calendar`;

  constructor(private http: HttpClient) { }

  getEventos(timeMin: string, timeMax: string, doctorId?: string): Observable<CalendarEvent[]> {
    let params = new HttpParams()
      .set('timeMin', timeMin)
      .set('timeMax', timeMax);
    
    if (doctorId) {
      params = params.set('doctorId', doctorId);
    }

    return this.http.get<CalendarEvent[]>(`${this.apiUrl}/eventos`, { params });
  }
}
