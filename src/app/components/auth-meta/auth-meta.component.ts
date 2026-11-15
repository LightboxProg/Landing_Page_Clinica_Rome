import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import Swal from 'sweetalert2';
import { EstadoMeta, MetaService } from '../../services/meta/meta.service';

// Conecta la cuenta de Instagram de la clínica con "Iniciar sesión con Facebook".
// El backend guarda el token de la página (no vence) y el bot lo usa para Instagram.
@Component({
  selector: 'app-auth-meta',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-meta.component.html',
  styleUrl: './auth-meta.component.css'
})
export class AuthMetaComponent implements OnInit, OnDestroy {
  // true cuando Instagram no está conectado o su token dejó de servir (punto rojo del avatar)
  @Output() requiereAtencion = new EventEmitter<boolean>();

  estado: EstadoMeta | null = null;
  loading = true;

  private routerSub?: Subscription;

  constructor(
    private metaService: MetaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkStatus();

    // El backend redirige de vuelta con ?meta=conectado|elegir|error
    this.processResultFromUrl(window.location.search);
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event) => {
      const navEnd = event as NavigationEnd;
      this.processResultFromUrl(new URL(navEnd.urlAfterRedirects, window.location.origin).search);
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  get activo(): boolean {
    return !!this.estado?.conectado && this.estado.token?.valido !== false;
  }

  // Se autorizaron varias páginas con Instagram y falta decir cuál usa el bot
  get porElegir(): boolean {
    return !this.estado?.conectado && (this.estado?.paginas?.length ?? 0) > 1;
  }

  get tokenInvalido(): boolean {
    return !!this.estado?.conectado && this.estado.token?.valido === false;
  }

  checkStatus(alTerminar?: () => void): void {
    this.metaService.getEstado().subscribe({
      next: (estado) => {
        this.aplicar(estado);
        alTerminar?.();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private aplicar(estado: EstadoMeta): void {
    this.estado = estado;
    this.loading = false;
    this.requiereAtencion.emit(!this.activo);
  }

  private processResultFromUrl(search: string): void {
    const params = new URLSearchParams(search);
    const resultado = params.get('meta');
    if (resultado === null) return;

    // Limpiar los query params de la URL de inmediato
    this.router.navigate([], {
      queryParams: {},
      queryParamsHandling: '',
      replaceUrl: true
    });

    if (resultado === 'conectado') {
      this.checkStatus(() => this.avisarConectado());
    } else if (resultado === 'elegir') {
      this.checkStatus(() => this.elegirPagina());
    } else {
      const motivo = params.get('motivo') || 'meta';
      const mensajes: Record<string, string> = {
        cancelado:     'Cancelaste el inicio de sesión con Facebook.',
        sesion:        'La solicitud venció o no es válida. Vuelve a intentarlo desde aquí.',
        sin_codigo:    'Facebook no envió el código de autorización.',
        sin_instagram: 'Ninguna de las páginas que autorizaste tiene una cuenta profesional de Instagram vinculada. Vincúlala desde la configuración de la página y vuelve a conectar.',
        meta:          'Meta rechazó la conexión. Revisa los permisos de la app e intenta de nuevo.'
      };
      Swal.fire('No se conectó Instagram', mensajes[motivo] || `Motivo: ${motivo}`, 'error');
    }
  }

  private avisarConectado(): void {
    const cuenta = this.estado?.instagram?.usuario ? `@${this.estado.instagram.usuario}` : 'La cuenta';
    if (this.estado?.aviso) {
      Swal.fire('Instagram conectado con un aviso', `${cuenta} quedó conectada, pero: ${this.estado.aviso}`, 'warning');
    } else {
      Swal.fire('Instagram conectado', `${cuenta} quedó conectada. El token de la página no vence.`, 'success');
    }
  }

  conectar(): void {
    this.loading = true;
    this.metaService.getAuthUrl().subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: (err) => {
        Swal.fire('No se pudo iniciar la conexión', err.error?.message || 'Intenta de nuevo.', 'error');
        this.loading = false;
      }
    });
  }

  async elegirPagina(): Promise<void> {
    const paginas = this.estado?.paginas || [];
    if (paginas.length === 0) return;

    const { value } = await Swal.fire({
      title: '¿Qué cuenta usará el bot?',
      text: 'Autorizaste varias páginas con Instagram. Elige la de la clínica.',
      input: 'select',
      inputOptions: Object.fromEntries(paginas.map(p => [p.id, p.instagramUsuario ? `${p.nombre} · @${p.instagramUsuario}` : p.nombre])),
      inputValue: this.estado?.pagina?.id || paginas[0].id,
      showCancelButton: true,
      confirmButtonText: 'Usar esta',
      cancelButtonText: 'Cancelar'
    });
    if (!value) return;

    this.metaService.elegirPagina(value).subscribe({
      next: (estado) => {
        this.aplicar(estado);
        this.avisarConectado();
      },
      error: (err) => Swal.fire('Error', err.error?.message || 'No se pudo elegir la página.', 'error')
    });
  }

  async desconectar(): Promise<void> {
    const { isConfirmed } = await Swal.fire({
      title: '¿Desconectar Instagram?',
      text: 'El bot dejará de usar esta cuenta hasta que la vuelvas a conectar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Desconectar',
      cancelButtonText: 'Cancelar'
    });
    if (!isConfirmed) return;

    this.metaService.desconectar().subscribe({
      next: () => this.checkStatus(),
      error: (err) => Swal.fire('Error', err.error?.message || 'No se pudo desconectar.', 'error')
    });
  }
}
