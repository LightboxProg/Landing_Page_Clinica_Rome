import { Component } from '@angular/core';
import { LoginComponent } from '../../components/usuarios/login/login.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [LoginComponent],
  template: '<app-login></app-login>',
  styles: [':host { display: block; }']
})
export class LoginPageComponent {}
