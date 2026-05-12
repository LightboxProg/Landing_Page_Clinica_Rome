import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio.component';
import { ServiciosComponent } from './pages/servicios/servicios.component';
import { CatalogoMembresiasComponent } from './components/membresias/catalogo-membresias/catalogo-membresias.component';
import { AvisoPrivacidadComponent } from './pages/aviso-privacidad/aviso-privacidad.component';
import { AvisoTerminosComponent } from './pages/aviso-terminos/aviso-terminos.component';
import { PasarelaMembresiasComponent } from './components/membresias/pasarela-membresias/pasarela-membresias.component';
import { CheckoutStatusComponent } from './components/membresias/checkout-status/checkout-status.component';
import { GestionComponent } from './pages/gestion/gestion.component';
import { LoginPageComponent } from './pages/login/login.component';
import { AgendarCitaComponent } from './pages/agendar-cita/agendar-cita.component';
import { NosotrosComponent } from './pages/nosotros/nosotros.component';
import { ContactoComponent } from './pages/contacto/contacto.component';
import { authGuard } from './guards/auth.guard';
import { LandingLayoutComponent } from './layouts/landing-layout/landing-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { UserListComponent } from './components/usuarios/user-list/user-list.component';
import { UserFormComponent } from './components/usuarios/user-form/user-form.component';

export const routes: Routes = [
  // Rutas públicas (Landing Page) que usan el LandingLayout (con Navbar y Footer)
  {
    path: '',
    component: LandingLayoutComponent,
    children: [
      { path: '', component: InicioComponent },
      { path: 'inicio', component: InicioComponent },
      { path: 'servicios', component: ServiciosComponent },
      { path: 'membresias', component: CatalogoMembresiasComponent },
      { path: 'agendar-cita', component: AgendarCitaComponent },
      { path: 'nosotros', component: NosotrosComponent },
      { path: 'contacto', component: ContactoComponent },
      { path: 'pasarela-membresias/:id', component: PasarelaMembresiasComponent },
      { path: 'checkout-status', component: CheckoutStatusComponent },
      { path: 'aviso-privacidad', component: AvisoPrivacidadComponent },
      { path: 'aviso-terminos', component: AvisoTerminosComponent },
    ]
  },

  // Rutas del Sistema/Admin que usan el AdminLayout (sin Navbar público)
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard], 
    children: [
      { path: 'login', component: LoginPageComponent, canActivate: [] }, // login sin guard
      { path: 'admin/gestion', component: GestionComponent },
      { path: 'usuarios', component: UserListComponent },
      { path: 'usuarios/nuevo', component: UserFormComponent },
      { path: 'usuarios/editar/:id', component: UserFormComponent }
    ]
  },

  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
