import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GestionServiciosComponent } from '../../components/servicios/gestion-servicios/gestion-servicios.component';
import { GestionCategoriasComponent } from '../../components/gestion-categorias/gestion-categorias.component';
import { GestionMembresiasComponent } from '../../components/membresias/gestion-membresias/gestion-membresias.component';

@Component({
  selector: 'app-gestion',
  standalone: true,
  imports: [CommonModule, GestionServiciosComponent, GestionCategoriasComponent, GestionMembresiasComponent],
  templateUrl: './gestion.component.html',
  styleUrl: './gestion.component.css'
})
export class GestionComponent {
  tabActivo: 'servicios' | 'membresias' = 'servicios';

  cambiarTab(tab: 'servicios' | 'membresias'): void {
    this.tabActivo = tab;
  }
}
