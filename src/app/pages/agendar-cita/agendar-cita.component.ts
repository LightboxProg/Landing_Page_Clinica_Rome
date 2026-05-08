import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-agendar-cita',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './agendar-cita.component.html',
  styleUrl: './agendar-cita.component.css'
})
export class AgendarCitaComponent {
  whatsappUrl = 'https://wa.me/524493664109?text=Hola%20quiero%20agendar%20una%20cita%20en%20Rome%20Harmony%20Clinic';
  telefono = '+52 449 366 4109';
  correo = 'contacto@clinicarome.com';
  ubicacionUrl = 'https://maps.google.com/?q=Mayo+de+1812+805+Frac+Morelos+1+Aguascalientes+Aguascalientes';
  telefonoHref = 'tel:+524493664109';
  correoHref = 'mailto:contacto@clinicarome.com';
}
