import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-aviso-privacidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aviso-privacidad.component.html',
  styleUrl: './aviso-privacidad.component.css'
})
export class AvisoPrivacidadComponent {
  // Estado para alternar entre aviso integral y de recepcion
  tipoAviso: 'integral' | 'recepcion' = 'integral';

  // Actualiza la pestana seleccionada
  setTipoAviso(tipo: 'integral' | 'recepcion'): void {
    this.tipoAviso = tipo;
  }
}
