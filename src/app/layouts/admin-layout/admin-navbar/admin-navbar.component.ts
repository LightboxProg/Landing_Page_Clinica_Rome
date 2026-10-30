import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../../services/auth/auth.service';
import { AuthGoogleComponent } from '../../../components/auth-google/auth-google.component';
import { AuthGoogleService } from '../../../services/auth-google/auth-google.service';
import { BusquedaRapidaComponent, DestinoRapido } from '../busqueda-rapida/busqueda-rapida.component';
import { TemaService } from '../../../services/tema/tema.service';
import { PushNotificationService } from '../../../services/notifications/push-notification.service';
import { RelativeTimePipe } from '../../../pipes/relative-time.pipe';
import { SwalService } from '../../../services/swal/swal.service';
import { SistemaService } from '../../../services/sistema/sistema.service';

type Rol = 'Administrador' | 'Recepcionista' | 'Doctor' | 'Especialista';

interface ItemMenu {
  label: string;
  icon: string;
  link?: string;
  // Pestaña de /admin/configuracion
  tab?: string;
  // Sólo los roles que el backend deja usar la página; sin roles, todos
  roles?: Rol[];
  accion?: 'copiarEnlace';
  // Muestra el punto rojo de errores nuevos (sólo Sistema)
  alerta?: 'errores';
}

interface SeccionMenu {
  id: string;
  label: string;
  icon: string;
  // Sección de un solo destino: va directo, sin desplegable
  link?: string;
  items?: ItemMenu[];
}

const CAJA: Rol[] = ['Administrador', 'Recepcionista'];

// Ordenado por uso: lo diario (agenda, chats, pacientes) va primero y a un clic
const MENU: SeccionMenu[] = [
  { id: 'agenda', label: 'Agenda', icon: 'fa-calendar-check', link: '/admin/gestion' },
  { id: 'chats', label: 'Chats', icon: 'fa-comments', link: '/admin/chats' },
  {
    id: 'pacientes', label: 'Pacientes', icon: 'fa-notes-medical', items: [
      { label: 'Lista de pacientes', icon: 'fa-list', link: '/admin/pacientes' },
      { label: 'Registrar paciente', icon: 'fa-user-plus', link: '/admin/pacientes/registro' },
      { label: 'Lista negra', icon: 'fa-ban', link: '/admin/pacientes/lista-negra' }
    ]
  },
  {
    id: 'caja', label: 'Caja', icon: 'fa-cash-register', items: [
      { label: 'Corte del día', icon: 'fa-receipt', link: '/admin/configuracion', tab: 'corteDiario', roles: CAJA },
      { label: 'Pagos de promociones', icon: 'fa-tags', link: '/admin/configuracion', tab: 'pagosPromo', roles: CAJA },
      { label: 'Membresías contratadas', icon: 'fa-id-card', link: '/admin/configuracion', tab: 'suscripciones' }
    ]
  },
  {
    id: 'marketing', label: 'Marketing', icon: 'fa-bullhorn', items: [
      { label: 'Prospectos', icon: 'fa-address-book', link: '/admin/leads' },
      { label: 'Campañas WhatsApp / IG', icon: 'fa-bullseye', link: '/admin/campanas', roles: CAJA },
      { label: 'Flujos del bot', icon: 'fa-project-diagram', link: '/admin/flujos', roles: CAJA },
      { label: 'Uso de IA', icon: 'fa-robot', link: '/admin/uso-ia', roles: CAJA },
      { label: 'Mensajería masiva', icon: 'fa-paper-plane', link: '/admin/mensajeria', roles: CAJA },
      { label: 'Publicar en Instagram', icon: 'fab fa-instagram', link: '/admin/instagram', roles: CAJA }
    ]
  },
  {
    id: 'config', label: 'Configuración', icon: 'fa-sliders', items: [
      { label: 'Servicios estéticos', icon: 'fa-spa', link: '/admin/configuracion', tab: 'servicios' },
      { label: 'Servicios dentales', icon: 'fa-tooth', link: '/admin/configuracion', tab: 'serviciosDentales' },
      { label: 'Planes de membresía', icon: 'fa-crown', link: '/admin/configuracion', tab: 'membresias' },
      { label: 'Promociones', icon: 'fa-percent', link: '/admin/configuracion', tab: 'promociones' },
      { label: 'Mis horarios', icon: 'fa-clock', link: '/admin/disponibilidad', roles: ['Especialista'] },
      { label: 'Copiar mi enlace de citas', icon: 'fa-share-nodes', accion: 'copiarEnlace', roles: ['Especialista'] },
      { label: 'Usuarios', icon: 'fa-user-shield', link: '/admin/usuarios', roles: ['Administrador'] },
      { label: 'Sistema', icon: 'fa-heart-pulse', link: '/admin/sistema', roles: ['Administrador'], alerta: 'errores' }
    ]
  }
];

// En el celular la barra inferior sólo lleva lo diario; el resto vive en "Menú"
const BARRA_MOVIL = ['agenda', 'chats', 'pacientes'];

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthGoogleComponent, RelativeTimePipe, BusquedaRapidaComponent],
  templateUrl: './admin-navbar.component.html',
  styleUrl: './admin-navbar.component.scss'
})
export class AdminNavbarComponent implements OnInit, OnDestroy {
  usuarioNombre = '';
  usuarioId = '';
  usuarioTipo = '';
  iniciales = '';

  secciones: SeccionMenu[] = [];
  seccionActiva: string | null = null;
  abierto: string | null = null;
  menuMovil = false;
  notifications: any[] = [];
  // Aviso en el avatar del administrador cuando Google Calendar está desconectado
  googleDesconectado = false;
  // Errores sin revisar de las últimas 24 h (Configuración → Sistema)
  erroresNuevos = 0;

  buscando = false;
  destinos: DestinoRapido[] = [];
  readonly atajo = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K';

  private rutaActual = '';
  private tabActual: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private pushService: PushNotificationService,
    private swalService: SwalService,
    private googleService: AuthGoogleService,
    private sistemaService: SistemaService,
    public temaService: TemaService
  ) { }

  ngOnInit(): void {
    const usuario = this.authService.getUsuario();
    if (usuario) {
      this.usuarioNombre = `${usuario.nombre} ${usuario.apeP}`;
      this.usuarioId = usuario.id;
      this.usuarioTipo = usuario.tipo;
      this.iniciales = `${usuario.nombre?.[0] || ''}${usuario.apeP?.[0] || ''}`.toUpperCase();
      this.pushService.loadNotifications(usuario.id).subscribe();
      if (usuario.tipo === 'Administrador') {
        this.googleService.getStatus().subscribe({ next: (res: any) => this.googleDesconectado = !res?.isLinked, error: () => {} });
        this.revisarErrores();
      }
    }

    this.secciones = MENU
      .map(s => ({ ...s, items: s.items?.filter(i => this.puedeVer(i)) }))
      .filter(s => s.link || (s.items && s.items.length > 0));

    // Todo lo que se puede abrir desde el menú también se encuentra en el buscador
    this.destinos = this.secciones.flatMap(s => s.link
      ? [{ label: s.label, grupo: 'Inicio', icon: s.icon, link: s.link }]
      : (s.items || []).filter(i => i.link).map(i => ({ label: i.label, grupo: s.label, icon: i.icon, link: i.link!, tab: i.tab })));

    this.subs.push(this.pushService.notifications$.subscribe(list => this.notifications = list));
    this.subs.push(this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.abierto = null;
      this.buscando = false;
      this.menuMovil = false;
      this.marcarSeccionActiva();
      if (this.usuarioTipo === 'Administrador') this.revisarErrores();
    }));
    this.marcarSeccionActiva();
  }

  // Se revisa al entrar y al volver a cada página: sin sondeo en segundo plano
  private revisarErrores(): void {
    this.sistemaService.contarRecientes().subscribe({ next: ({ total }) => this.erroresNuevos = total, error: () => {} });
  }

  tieneAlerta(s: SeccionMenu): boolean {
    return this.erroresNuevos > 0 && !!s.items?.some(i => i.alerta === 'errores');
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private puedeVer(item: ItemMenu): boolean {
    return !item.roles || item.roles.includes(this.usuarioTipo as Rol);
  }

  get seccionesBarraMovil(): SeccionMenu[] {
    return this.secciones.filter(s => BARRA_MOVIL.includes(s.id));
  }

  get noLeidas(): number {
    return this.notifications.filter(n => !n.leida).length;
  }

  // Los íconos de marca (fab) traen su prefijo; el resto es sólido
  claseIcono(icon: string): string {
    return icon.includes(' ') ? icon : `fas ${icon}`;
  }

  queryParams(item: ItemMenu): Record<string, string> | null {
    return item.tab ? { tab: item.tab } : null;
  }

  // Resalta la sección y la opción de la página actual. Las pestañas de
  // configuración comparten ruta y se distinguen por ?tab.
  private marcarSeccionActiva(): void {
    const arbol = this.router.parseUrl(this.router.url);
    this.rutaActual = '/' + (arbol.root.children['primary']?.segments.map(s => s.path).join('/') || '');
    this.tabActual = arbol.queryParams['tab'] || (this.rutaActual === '/admin/configuracion' ? 'servicios' : null);
    const seccion = this.secciones.find(s => this.esActivo(s.link) || s.items?.some(i => this.esActivo(i.link, i.tab)));
    this.seccionActiva = seccion?.id || null;
  }

  esActivo(link?: string, tab?: string): boolean {
    if (!link) return false;
    if (tab) return this.rutaActual === link && this.tabActual === tab;
    // "Lista de pacientes" no debe quedar activa dentro de "Registrar paciente"
    const hermanaMasEspecifica = MENU.some(s => s.items?.some(i => i.link && i.link !== link && i.link.startsWith(link + '/') && this.rutaActual.startsWith(i.link)));
    return this.rutaActual === link || (this.rutaActual.startsWith(link + '/') && !hermanaMasEspecifica);
  }

  // ===== Desplegables =====

  alternar(id: string, event: Event): void {
    event.stopPropagation();
    this.abierto = this.abierto === id ? null : id;
  }

  ejecutar(item: ItemMenu): void {
    if (item.accion === 'copiarEnlace') this.copiarEnlaceCitas();
    this.abierto = null;
    this.menuMovil = false;
  }

  alternarMenuMovil(): void {
    this.menuMovil = !this.menuMovil;
    this.abierto = null;
  }

  @HostListener('document:click', ['$event'])
  cerrarAlHacerClicFuera(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.desplegable')) this.abierto = null;
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.abierto = null;
    this.menuMovil = false;
  }

  @HostListener('document:keydown', ['$event'])
  atajoBuscar(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.abrirBusqueda();
    }
  }

  abrirBusqueda(): void {
    this.abierto = null;
    this.menuMovil = false;
    this.buscando = true;
  }

  // ===== Acciones =====

  copiarEnlaceCitas(): void {
    const shareUrl = `${window.location.origin}/agendar-cita?doctor=${this.usuarioId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.swalService.toast('Enlace para agendar copiado', '', 'success');
    }).catch(err => {
      console.error('Error al copiar el enlace: ', err);
      this.swalService.error('No se pudo copiar el enlace automáticamente.', 'Error');
    });
  }

  getIcon(tipo: string): string {
    return this.pushService.getNotificationIcon(tipo);
  }

  marcarLeida(note: any): void {
    if (note._id && !note.leida) {
      this.pushService.markAsRead(note._id).subscribe(() => {
        note.leida = true;
      });
    }
  }

  clearNotifications(): void {
    this.pushService.clearNotifications();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
