import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';
import { AuthGoogleComponent } from '../../../components/auth-google/auth-google.component';
import { PushNotificationService } from '../../../services/notifications/push-notification.service';
import { RelativeTimePipe } from '../../../pipes/relative-time.pipe';
import { SwalService } from '../../../services/swal/swal.service';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AuthGoogleComponent, RelativeTimePipe],
  templateUrl: './admin-navbar.component.html',
  styleUrl: './admin-navbar.component.scss'
})

export class AdminNavbarComponent implements OnInit {
  usuarioNombre: string = '';
  usuarioId: string = '';
  usuarioTipo: string = '';
  openGroup: string | null = null;
  notifications: any[] = [];
  showNotifications = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private pushService: PushNotificationService,
    private swalService: SwalService
  ) { }

  toggleGroup(event: Event, groupName: string) {
    if (window.innerWidth <= 768) {
      event.stopPropagation();
      this.openGroup = this.openGroup === groupName ? null : groupName;
    }
  }

  ngOnInit(): void {
    const usuario = this.authService.getUsuario();
    if (usuario) {
      this.usuarioNombre = `${usuario.nombre} ${usuario.apeP}`;
      this.usuarioId = usuario.id;
      this.usuarioTipo = usuario.tipo;
      
      this.pushService.loadNotifications(usuario.id).subscribe();
    }

    this.pushService.notifications$.subscribe(list => {
      this.notifications = list;
    });
  }

  copiarEnlaceCitas(): void {
    const host = window.location.origin;
    const shareUrl = `${host}/agendar-cita?doctor=${this.usuarioId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.swalService.success('El enlace para agendar citas ha sido copiado al portapapeles.', '¡Enlace Copiado!');
    }).catch(err => {
      console.error('Error al copiar el enlace: ', err);
      this.swalService.error('No se pudo copiar el enlace automáticamente.', 'Error');
    });
  }

  getIcon(tipo: string): string {
    return this.pushService.getNotificationIcon(tipo);
  }

  marcarLeida(note: any) {
    if (note._id && !note.leida) {
      this.pushService.markAsRead(note._id).subscribe(() => {
        note.leida = true;
      });
    }
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
  }

  @HostListener('document:click', ['$event'])
  closeDropdowns(event: Event) {
    const target = event.target as HTMLElement;
    
    // Cerrar grupos en móvil
    if (window.innerWidth <= 768) {
      if (!target.closest('.nav-group')) {
        this.openGroup = null;
      }
    }

    // Cerrar notificaciones
    if (!target.closest('.notification-center')) {
      this.showNotifications = false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  clearNotifications() {
    this.pushService.clearNotifications();
  }
}