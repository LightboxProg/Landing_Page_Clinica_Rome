import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si la petición ya tiene Authorization o tiene el token en la URL (evita el bug de Safari/WebKit con FormData), pasar de largo
  if (req.headers.has('Authorization') || req.url.includes('token=')) {
    return next(req);
  }

  const token = authService.getToken();

  // No adjuntar token a la ruta de login
  if (req.url.includes('/login')) {
    return next(req);
  }

  if (token) {
    req = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
      body: req.body
    });
  }

  return next(req).pipe(
    catchError(error => {
      if (error.status === 401 || error.status === 403) {
        // Token expirado o inválido
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
