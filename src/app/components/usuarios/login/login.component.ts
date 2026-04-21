import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  usuario = '';
  password = '';
  cargando = false;
  error = '';
  mostrarPassword = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Si ya está logueado, redirigir al panel
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/gestion']);
    }
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  onSubmit(): void {
    if (!this.usuario.trim() || !this.password.trim()) {
      this.error = 'Ingresa tu usuario y contraseña';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.authService.login(this.usuario.trim(), this.password).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/admin/gestion']);
      },
      error: (err) => {
        this.cargando = false;
        if (err.status === 404) {
          this.error = 'Usuario no encontrado';
        } else if (err.status === 401) {
          this.error = 'Contraseña incorrecta';
        } else {
          this.error = err.error?.message || 'Error al iniciar sesión';
        }
      }
    });
  }
}
