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

export const routes: Routes = [

  { path: '', component: InicioComponent },
  { path: 'servicios', component: ServiciosComponent },
  { path: 'membresias', component: CatalogoMembresiasComponent },
  { path: 'pasarela-membresias/:id', component: PasarelaMembresiasComponent },
  { path: 'checkout-status', component: CheckoutStatusComponent },
  { path: 'agendar-cita', component: AgendarCitaComponent },
  { path: 'nosotros', component: NosotrosComponent },
  { path: 'contacto', component: ContactoComponent },
  { path: 'aviso-privacidad', component: AvisoPrivacidadComponent },
  { path: 'aviso-terminos', component: AvisoTerminosComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'admin/gestion', component: GestionComponent, canActivate: [authGuard] },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
