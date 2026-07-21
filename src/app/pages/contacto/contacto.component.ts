import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../directives/reveal.directive';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealDirective],
  templateUrl: './contacto.component.html',
  styleUrl: './contacto.component.css'
})
export class ContactoComponent {
  phoneHref = 'tel:+524493664109';
  whatsappHref = 'https://wa.me/524493664109?text=Hola%20quiero%20información%20de%20Rome%20Harmony%20Clinic';
  emailHref = 'mailto:contacto@clinicarome.com';
  mapsHref = 'https://maps.google.com/?q=Mayo+de+1812+805+Frac+Morelos+1+Aguascalientes+Aguascalientes';
}
