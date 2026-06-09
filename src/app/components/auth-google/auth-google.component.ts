import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthGoogleService } from '../../services/auth-google/auth-google.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-auth-google',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-google.component.html',
  styleUrl: './auth-google.component.css'
})
export class AuthGoogleComponent implements OnInit, OnDestroy {
  isLinked: boolean = false;
  lastUpdate: string | null = null;
  loading: boolean = true;

  private routerSub?: Subscription;

  constructor(
    private googleService: AuthGoogleService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkStatus();

    // Procesar el resultado si viene en la URL al montar el componente
    this.processResultFromUrl(window.location.search);

    // Escuchar navegaciones futuras (el backend redirige de vuelta con ?linked=)
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navEnd = event as NavigationEnd;
      const search = new URL(navEnd.urlAfterRedirects, window.location.origin).search;
      this.processResultFromUrl(search);
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  checkStatus(): void {
    this.googleService.getStatus().subscribe({
      next: (res) => {
        this.isLinked = res.isLinked;
        this.lastUpdate = res.updatedAt;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /**
   * Procesa el resultado del callback de Google.
   * El backend redirige con ?linked=true o ?linked=false&reason=...
   */
  private processResultFromUrl(search: string): void {
    const params = new URLSearchParams(search);
    const linked = params.get('linked');

    if (linked === null) return;

    // Limpiar los query params de la URL de inmediato
    this.router.navigate([], {
      queryParams: {},
      queryParamsHandling: '',
      replaceUrl: true
    });

    if (linked === 'true') {
      Swal.fire('Vinculado', 'Google Calendar conectado correctamente.', 'success');
      this.isLinked = true;
      this.checkStatus();
    } else {
      const reason = params.get('reason') || 'error_desconocido';
      const messages: Record<string, string> = {
        no_refresh_token: 'Revoca el acceso en myaccount.google.com/permissions e intenta de nuevo.',
        missing_code:     'Google no envio el codigo de autorizacion.',
        server_error:     'Error interno al procesar la autorizacion.',
      };
      const detail = messages[reason] || `Razon: ${reason}`;
      Swal.fire('Error al vincular', detail, 'error');
    }
  }

  linkGoogle(): void {
    this.loading = true;
    this.googleService.getAuthUrl().subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: () => {
        Swal.fire('Error', 'No se pudo iniciar el proceso de vinculacion.', 'error');
        this.loading = false;
      }
    });
  }
}
