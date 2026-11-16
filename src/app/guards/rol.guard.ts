import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { Permiso, ROLES, Rol, inicioDe, tiene } from '../services/auth/permisos';

// Rutas con data: { permiso }. Quien no lo tiene vuelve a su página de inicio
// en lugar de ver una pantalla que el backend le va a negar.
export const rolGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const tipo = auth.getUsuario()?.tipo;
  // Sesión con un rol que ya no existe (p. ej. "Recepcionista"): a volver a entrar
  if (!ROLES.includes(tipo as Rol)) {
    auth.logout();
    return false;
  }
  const permisos: Permiso[] = [].concat(route.data['permiso'] || []);
  if (permisos.some(p => tiene(tipo, p))) return true;
  return inject(Router).parseUrl(inicioDe(tipo));
};
