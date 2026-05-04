import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GestionServiciosComponent } from '../../components/servicios/gestion-servicios/gestion-servicios.component';
import { GestionCategoriasComponent } from '../../components/gestion-categorias/gestion-categorias.component';
import { GestionMembresiasComponent } from '../../components/membresias/gestion-membresias/gestion-membresias.component';
import { MembresiasAdquiridasComponent } from '../../components/membresias/membresias-adquiridas/membresias-adquiridas.component';

@Component({
  selector: 'app-gestion',
  standalone: true,
  imports: [CommonModule, GestionServiciosComponent, GestionCategoriasComponent, GestionMembresiasComponent, MembresiasAdquiridasComponent],
  templateUrl: './gestion.component.html',
  styleUrl: './gestion.component.css'
})
export class GestionComponent {
  tabActivo: 'servicios' | 'membresias' | 'suscripciones' = 'servicios';

  cambiarTab(tab: 'servicios' | 'membresias' | 'suscripciones'): void {
    this.tabActivo = tab;
  }
}
