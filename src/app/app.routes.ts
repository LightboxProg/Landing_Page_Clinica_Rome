import { Routes } from '@angular/router';
import { HomeComponent } from './paginas/home/home.component';
import { AboutComponent } from './paginas/about/about.component';
import { ServicesComponent } from './paginas/services/services.component';
import { ContactComponent } from './paginas/contact/contact.component';


export const routes: Routes = [
  { path: '', component: HomeComponent},
  { path: 'about', component: AboutComponent },
  { path: 'services', component: ServicesComponent },
  { path: 'contact', component: ContactComponent },
  { path: '**', redirectTo: '' } // redirige a home si la ruta no existe
];