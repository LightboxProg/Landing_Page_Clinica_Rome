import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio.component').then(m => m.InicioComponent)
  },
  {
    path: 'servicios',
    loadComponent: () => import('./pages/servicios/servicios.component').then(m => m.ServiciosComponent)
  },
  // PROTOCOLOS
  {
    path: 'membresias',
    loadComponent: () => import('./components/membresias/catalogo-membresias/catalogo-membresias.component').then(m => m.CatalogoMembresiasComponent)
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
