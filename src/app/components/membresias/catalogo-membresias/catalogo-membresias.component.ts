import { Component } from '@angular/core';

@Component({
  selector: 'app-catalogo-membresias',
  standalone: true,
  imports: [], 
  templateUrl: './catalogo-membresias.component.html',
  styleUrl: './catalogo-membresias.component.css'
})
export class CatalogoMembresiasComponent {

  infoGeneral = {
    anticipo: '$1,000',
    pagos: '8 pagos quincenales',
    bonoPromo: '$500 (Primeras 20 pacientes)'
  };

  tratamientosIndividuales = [
    {
      titulo: 'Botox Glow (Técnica Roxy Eyes)',
      total: '$5,400',
      pagoQuincenal: '$550',
      utiliza: 'Toxina botulínica',
      paraTi: 'buscas suavizar líneas y elevar tu mirada sin que se note',
      resultado: 'mirada más fresca, abierta y natural'
    },
    {
      titulo: 'Filler Glow (Ácido Hialurónico)',
      total: '$6,800',
      pagoQuincenal: '$725',
      utiliza: 'Ácido hialurónico de alta reticulación',
      paraTi: 'quieres volumen o definición natural',
      resultado: 'facciones más armónicas y definidas'
    },
    {
      titulo: 'Collagen Boost (Bioestimulador)',
      total: '$14,000',
      pagoQuincenal: '$1,625',
      utiliza: 'Bioestimulador de colágeno',
      paraTi: 'notas flacidez o quieres prevenir envejecimiento',
      resultado: 'piel más firme, densa y rejuvenecida'
    }
  ];

  protocolosFaciales = [
    {
      titulo: 'Anti-Age Lift Protocol',
      total: '$17,800',
      pagoQuincenal: '$2,100',
      utiliza: 'Botox zona antifaz + bioestimulador',
      paraTi: 'notas flacidez o mirada cansada',
      resultado: 'rostro más firme y rejuvenecido'
    },
    {
      titulo: 'Profile Harmony Protocol',
      total: '$24,600',
      pagoQuincenal: '$2,950',
      utiliza: '4 jeringas de ácido hialurónico',
      paraTi: 'quieres mejorar tu perfil',
      resultado: 'perfil armónico y atractivo'
    },
    {
      titulo: 'Total Harmony Protocol',
      total: '$36,600',
      pagoQuincenal: '$4,450',
      utiliza: '6 jeringas de ácido hialurónico',
      paraTi: 'buscas un cambio completo (requiere valoración)',
      resultado: 'rostro completamente armonizado y definido'
    }
  ];
}
