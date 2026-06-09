import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthGoogleService } from '../../services/auth-google/auth-google.service';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-auth-google',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-google.component.html',
  styleUrl: './auth-google.component.css'
})
export class AuthGoogleComponent implements OnInit {
  isLinked: boolean = false;
  lastUpdate: string | null = null;
  loading: boolean = true;

  constructor(
    private googleService: AuthGoogleService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkStatus();
    this.handleCallback();
  }

  checkStatus(): void {
    this.googleService.getStatus().subscribe({
      next: (res) => {
        this.isLinked = res.isLinked;
        this.lastUpdate = res.updatedAt;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al verificar estado de Google:', err);
        this.loading = false;
      }
    });
  }

  handleCallback(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.loading = true;
      this.googleService.confirmCallback(code).subscribe({
        next: (res) => {
          Swal.fire('¡Éxito!', 'Calendario de Google vinculado correctamente', 'success');
          this.isLinked = true;
          this.loading = false;
          // Limpiar la URL de los parámetros de búsqueda
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { code: null },
            queryParamsHandling: 'merge'
          });
          this.checkStatus();
        },
        error: (err) => {
          console.error('Error en callback de Google:', err);
          Swal.fire('Error', 'No se pudo vincular el calendario. Asegúrate de otorgar todos los permisos.', 'error');
          this.loading = false;
        }
      });
    }
  }

  linkGoogle(): void {
    this.loading = true;
    this.googleService.getAuthUrl().subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: (err) => {
        console.error('Error al obtener URL de Google:', err);
        Swal.fire('Error', 'No se pudo iniciar el proceso de vinculación.', 'error');
        this.loading = false;
      }
    });
  }
}
