import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Tema = 'claro' | 'oscuro';

const CLAVE = 'rome_admin_tema';

// Tema del panel administrativo. Se guarda por navegador; si nunca se ha
// elegido, sigue al sistema operativo. Sólo el layout del admin lo aplica:
// la página pública siempre es clara.
@Injectable({ providedIn: 'root' })
export class TemaService {
  private temaSubject = new BehaviorSubject<Tema>(this.inicial());
  tema$ = this.temaSubject.asObservable();

  get tema(): Tema {
    return this.temaSubject.value;
  }

  private inicial(): Tema {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado === 'claro' || guardado === 'oscuro') return guardado;
    } catch { /* almacenamiento bloqueado: se sigue al sistema */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }

  alternar(): void {
    this.fijar(this.tema === 'oscuro' ? 'claro' : 'oscuro');
  }

  fijar(tema: Tema): void {
    try { localStorage.setItem(CLAVE, tema); } catch { /* sin persistencia */ }
    this.temaSubject.next(tema);
    this.aplicar();
  }

  // Lo llama el layout del admin al entrar
  aplicar(): void {
    document.documentElement.setAttribute('data-tema', this.tema);
  }

  // Al salir del panel la página pública vuelve a su tema claro
  quitar(): void {
    document.documentElement.removeAttribute('data-tema');
  }
}
