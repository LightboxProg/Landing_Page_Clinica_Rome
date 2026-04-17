import { Routes } from '@angular/router';
import { InicioComponent } from './pages/inicio/inicio.component';
import { ServiciosComponent } from './pages/servicios/servicios.component';
import { CatalogoMembresiasComponent } from './components/membresias/catalogo-membresias/catalogo-membresias.component';

export const routes: Routes = [

  { path: '', component: InicioComponent },
  { path: 'servicios', component: ServiciosComponent },
  { path: 'membresias', component: CatalogoMembresiasComponent },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
