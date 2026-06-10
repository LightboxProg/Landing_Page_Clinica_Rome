import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private messaging: any;
  private currentMessage = new BehaviorSubject<any>(null);
  message$ = this.currentMessage.asObservable();

  private notificationsList = new BehaviorSubject<any[]>([]);
  notifications$ = this.notificationsList.asObservable();

  constructor(private http: HttpClient) {
    try {
      const app = initializeApp(environment.firebase);
      this.messaging = getMessaging(app);
    } catch (e) {
      console.error('Error al inicializar Firebase Messaging:', e);
    }
  }

  /**
   * Carga las notificaciones guardadas del usuario desde el servidor
   */
  loadNotifications(usuarioId: string) {
    return this.http.get<any[]>(`${environment.apiUrl}/notificaciones/${usuarioId}`)
      .pipe(
        tap(list => {
          const normalized = list.map(n => ({
            ...n,
            notification: { title: n.titulo, body: n.cuerpo },
            receivedAt: n.fecha || n.createdAt
          }));
          this.notificationsList.next(normalized);
        })
      );
  }

  markAsRead(id: string) {
    return this.http.put(`${environment.apiUrl}/notificaciones/${id}/leer`, {});
  }

  getNotificationIcon(tipo: string): string {
    switch (tipo) {
      case 'cita': return 'fas fa-calendar-check';
      case 'recordatorio': return 'fas fa-clock';
      case 'mensaje': return 'fas fa-envelope';
      case 'lead': return 'fas fa-user-plus';
      default: return 'fas fa-bell';
    }
  }

  /**
   * Solicita permiso y obtiene el token de FCM
   * @param tipo - 'usuario' o 'paciente'
   * @param id - ID de la entidad en BD
   */
  async requestPermission(tipo: 'usuario' | 'paciente', id: string) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(this.messaging, { vapidKey: environment.vapidKey });
        if (token) {
          console.log('Token FCM obtenido:', token);
          this.saveToken(token, tipo, id).subscribe({
            next: () => console.log('Token guardado en el servidor.'),
            error: (err) => console.error('Error al guardar token en servidor:', err)
          });
        }
      }
    } catch (error) {
      console.error('Error al solicitar permiso de notificación:', error);
    }
  }

  private saveToken(token: string, tipo: 'usuario' | 'paciente', id: string) {
    return this.http.post(`${environment.apiUrl}/notificaciones/token`, { token, tipo, id });
  }

  listenForMessages() {
    onMessage(this.messaging, (payload: any) => {
      console.log('Mensaje recibido en primer plano:', payload);
      
      // Agregar timestamp de recepción
      payload.receivedAt = new Date();
      
      this.currentMessage.next(payload);
      
      // Agregar a la lista de notificaciones (mantener persistencia local)
      const currentList = this.notificationsList.value;
      this.notificationsList.next([payload, ...currentList]);
    });
  }

  clearNotifications() {
    this.notificationsList.next([]);
  }
}
