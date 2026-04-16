import { Routes } from '@angular/router';

import { ServicesComponent } from './paginas/services/services.component';


export const routes: Routes = [
  { path: '', component: ServicesComponent },
  { path: '**', redirectTo: '' } // redirige a services si la ruta no existe
];