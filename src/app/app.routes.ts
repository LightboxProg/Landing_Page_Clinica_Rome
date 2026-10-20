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
import { NosotrosComponent } from './pages/nosotros/nosotros.component';
import { ContactoComponent } from './pages/contacto/contacto.component';
import { authGuard } from './guards/auth.guard';
import { LandingLayoutComponent } from './layouts/landing-layout/landing-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { UserListComponent } from './components/usuarios/user-list/user-list.component';
import { UserFormComponent } from './components/usuarios/user-form/user-form.component';
import { PacientesComponent } from './components/pacientes/pacientes/pacientes.component';
import { PacienteRegistroComponent } from './components/pacientes/paciente-registro/paciente-registro.component';
import { PerfilPacienteComponent } from './components/pacientes/perfil-paciente/perfil-paciente.component';
import { PacientesListadosComponent } from './components/pacientes/pacientes-listados/pacientes-listados.component';
import { LeadsComponent } from './pages/leads/leads.component';
import { CalendarioAdminComponent } from './pages/Calendario/calendario.component';
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
      { path: 'membresias', component: CatalogoMembresiasComponent },
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
      { path: 'pasarela-membresias/:id', component: PasarelaMembresiasComponent },
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
      { path: 'admin/gestion', component: CalendarioAdminComponent },
      // Lazy por el budget de 3 MB del bundle inicial (promociones creció con los renglones)
      {
        path: 'admin/configuracion',
        loadComponent: () => import('./pages/gestion/gestion.component').then(m => m.GestionComponent)
      },
      { path: 'admin/leads', component: LeadsComponent },
      {
        path: 'admin/mensajeria',
        loadComponent: () => import('./pages/mensajeria-masiva-page/mensajeria-masiva-page.component').then(m => m.MensajeriaMasivaPageComponent)
      },
      // Carga diferida: el bundle inicial ya roza el budget de 3 MB de angular.json
      {
        path: 'admin/campanas',
        loadComponent: () => import('./pages/campanas/campanas.component').then(m => m.CampanasComponent)
      },
      {
        path: 'admin/instagram',
        loadComponent: () => import('./pages/instagram/instagram.component').then(m => m.InstagramComponent)
      },
      { path: 'admin/chats', component: ChatsComponent },
      { path: 'admin/disponibilidad', component: DisponibilidadComponent },

      // Usuarios (restaurados a sus paths originales para evitar conflictos)
      { path: 'admin/usuarios', component: UserListComponent },
      { path: 'admin/usuarios/nuevo', component: UserFormComponent },
      { path: 'admin/usuarios/editar/:id', component: UserFormComponent },

      // Pacientes (restaurados a sus paths originales)
      { path: 'admin/pacientes', component: PacientesComponent },
      { path: 'admin/pacientes/registro', component: PacienteRegistroComponent },
      { path: 'admin/pacientes/perfil/:id', component: PerfilPacienteComponent },
      { path: 'admin/pacientes/lista-negra', component: PacientesListadosComponent },
    ]
  },

  // Redirección por defecto
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
