import { environment } from '../environments/environment';
import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio.component';
import { ServiciosComponent } from './pages/servicios/servicios.component';
import { CatalogoMembresiasComponent } from './components/membresias/catalogo-membresias/catalogo-membresias.component';
import { AvisoPrivacidadComponent } from './pages/aviso-privacidad/aviso-privacidad.component';
import { AvisoTerminosComponent } from './pages/aviso-terminos/aviso-terminos.component';
import { PasarelaMembresiasComponent } from './components/membresias/pasarela-membresias/pasarela-membresias.component';
import { CheckoutStatusComponent } from './components/membresias/checkout-status/checkout-status.component';
import { LoginPageComponent } from './pages/login/login.component';
import { AgendarCitaComponent } from './pages/agendar-cita/agendar-cita.component';
import { PagarPromoComponent } from './pages/pagar-promo/pagar-promo.component';
import { AceptarTerminosComponent } from './pages/aceptar-terminos/aceptar-terminos.component';
import { NosotrosComponent } from './pages/nosotros/nosotros.component';
import { ContactoComponent } from './pages/contacto/contacto.component';
import { authGuard } from './guards/auth.guard';
import { rolGuard } from './guards/rol.guard';
import { LandingLayoutComponent } from './layouts/landing-layout/landing-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { UserListComponent } from './components/usuarios/user-list/user-list.component';
import { UserFormComponent } from './components/usuarios/user-form/user-form.component';
import { PacientesComponent } from './components/pacientes/pacientes/pacientes.component';
import { PacienteRegistroComponent } from './components/pacientes/paciente-registro/paciente-registro.component';
import { PerfilPacienteComponent } from './components/pacientes/perfil-paciente/perfil-paciente.component';
import { PacientesListadosComponent } from './components/pacientes/pacientes-listados/pacientes-listados.component';
import { LeadsComponent } from './pages/leads/leads.component';
import { ChatsComponent } from './pages/chats/chats.component';
import { DisponibilidadComponent } from './pages/disponibilidad/disponibilidad.component';

import { CheckoutLayoutComponent } from './layouts/checkout-layout/checkout-layout.component';

export const routes: Routes = [
  // ============================================
  // RUTAS PÚBLICAS LANDING
  // ============================================
  {
    path: '',
    component: LandingLayoutComponent,
    children: [
      { path: '', component: InicioComponent },
      { path: 'inicio', component: InicioComponent },
      { path: 'servicios', component: ServiciosComponent },
      {
        path: 'promociones',
        loadComponent: () => import('./pages/promociones/promociones.component').then(m => m.PromocionesComponent)
      },
      // Ocultas en el arranque: la URL vieja lleva al inicio
      environment.membresiasPublicas
        ? { path: 'membresias', component: CatalogoMembresiasComponent }
        : { path: 'membresias', redirectTo: '' },
      { path: 'nosotros', component: NosotrosComponent },
      { path: 'contacto', component: ContactoComponent },
      { path: 'aviso-privacidad', component: AvisoPrivacidadComponent },
      { path: 'aviso-terminos', component: AvisoTerminosComponent },
    ]
  },

  // ============================================
  // RUTAS DE AGENDAMIENTO Y CHECKOUT (LAYOUT DEDICADO)
  // ============================================
  {
    path: '',
    component: CheckoutLayoutComponent,
    children: [
      { path: 'agendar-cita', component: AgendarCitaComponent },
      { path: 'pagar-promo', component: PagarPromoComponent },
      // Enlace que recepción manda a quien pagó por OXXO, transferencia, etc.
      { path: 'aceptar/:codigo', component: AceptarTerminosComponent },
      { path: 'aceptar', component: AceptarTerminosComponent },
      environment.membresiasPublicas
        ? { path: 'pasarela-membresias/:id', component: PasarelaMembresiasComponent }
        : { path: 'pasarela-membresias/:id', redirectTo: '' },
      { path: 'checkout-status', component: CheckoutStatusComponent },
      { path: 'return', component: CheckoutStatusComponent },
      { path: 'cancel', component: CheckoutStatusComponent },
    ]
  },

  // ============================================
  // LOGIN (público, sin guard)
  // ============================================
  { path: 'login', component: LoginPageComponent },

  // ============================================
  // RUTAS PRIVADAS
  // ============================================
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard],   // Guard solo para rutas administrativas
    children: [
      // Gestión y Leads
      // Agenda en carga diferida: FullCalendar pesa y el bundle inicial roza el budget de 3 MB
      {
        path: 'admin/gestion',
        canActivate: [rolGuard],
        data: { permiso: 'agenda' },
        loadComponent: () => import('./pages/Calendario/calendario.component').then(m => m.CalendarioAdminComponent)
      },
      // Lazy por el budget de 3 MB del bundle inicial (promociones creció con los renglones)
      {
        path: 'admin/configuracion',
        canActivate: [rolGuard],
        data: { permiso: ['corteDiario', 'pagosPromo', 'aceptaciones', 'suscripciones', 'catalogo', 'promociones'] },
        loadComponent: () => import('./pages/gestion/gestion.component').then(m => m.GestionComponent)
      },
      { path: 'admin/leads', component: LeadsComponent, canActivate: [rolGuard], data: { permiso: 'prospectos' } },
      {
        path: 'admin/mensajeria',
        canActivate: [rolGuard],
        data: { permiso: 'marketing' },
        loadComponent: () => import('./pages/mensajeria-masiva-page/mensajeria-masiva-page.component').then(m => m.MensajeriaMasivaPageComponent)
      },
      // Carga diferida: el bundle inicial ya roza el budget de 3 MB de angular.json
      {
        path: 'admin/campanas',
        canActivate: [rolGuard],
        data: { permiso: 'marketing' },
        loadComponent: () => import('./pages/campanas/campanas.component').then(m => m.CampanasComponent)
      },
      {
        path: 'admin/flujos',
        canActivate: [rolGuard],
        data: { permiso: 'marketing' },
        loadComponent: () => import('./pages/flujos/flujos.component').then(m => m.FlujosComponent)
      },
      {
        path: 'admin/uso-ia',
        canActivate: [rolGuard],
        data: { permiso: 'marketing' },
        loadComponent: () => import('./pages/uso-ia/uso-ia.component').then(m => m.UsoIaComponent)
      },
      {
        path: 'admin/sistema',
        canActivate: [rolGuard],
        data: { permiso: 'admin' },
        loadComponent: () => import('./pages/sistema/sistema.component').then(m => m.SistemaComponent)
      },
      {
        path: 'admin/instagram',
        canActivate: [rolGuard],
        data: { permiso: 'marketing' },
        loadComponent: () => import('./pages/instagram/instagram.component').then(m => m.InstagramComponent)
      },
      // Cotizador: nueva (?paciente=) o una guardada; carga diferida por el budget del bundle
      {
        path: 'admin/cotizador',
        canActivate: [rolGuard],
        data: { permiso: 'cotizar' },
        loadComponent: () => import('./pages/cotizador/cotizador.component').then(m => m.CotizadorComponent)
      },
      {
        path: 'admin/cotizador/:id',
        canActivate: [rolGuard],
        data: { permiso: 'cotizar' },
        loadComponent: () => import('./pages/cotizador/cotizador.component').then(m => m.CotizadorComponent)
      },
      { path: 'admin/chats', component: ChatsComponent, canActivate: [rolGuard], data: { permiso: 'chats' } },
      { path: 'admin/disponibilidad', component: DisponibilidadComponent, canActivate: [rolGuard], data: { permiso: 'disponibilidad' } },

      // Usuarios (restaurados a sus paths originales para evitar conflictos)
      { path: 'admin/usuarios', component: UserListComponent, canActivate: [rolGuard], data: { permiso: 'admin' } },
      { path: 'admin/usuarios/nuevo', component: UserFormComponent, canActivate: [rolGuard], data: { permiso: 'admin' } },
      { path: 'admin/usuarios/editar/:id', component: UserFormComponent, canActivate: [rolGuard], data: { permiso: 'admin' } },

      // Pacientes (restaurados a sus paths originales)
      { path: 'admin/pacientes', component: PacientesComponent, canActivate: [rolGuard], data: { permiso: 'listaPacientes' } },
      { path: 'admin/pacientes/registro', component: PacienteRegistroComponent, canActivate: [rolGuard], data: { permiso: 'expediente' } },
      { path: 'admin/pacientes/perfil/:id', component: PerfilPacienteComponent, canActivate: [rolGuard], data: { permiso: 'expediente' } },
      { path: 'admin/pacientes/lista-negra', component: PacientesListadosComponent, canActivate: [rolGuard], data: { permiso: 'expediente' } },
    ]
  },

  // Redirección por defecto
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
