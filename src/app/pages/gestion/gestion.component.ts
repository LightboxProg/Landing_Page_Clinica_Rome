import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GestionServiciosComponent } from '../../components/servicios/gestion-servicios/gestion-servicios.component';
import { GestionCategoriasComponent } from '../../components/gestion-categorias/gestion-categorias.component';
import { GestionMembresiasComponent } from '../../components/membresias/gestion-membresias/gestion-membresias.component';
import { MembresiasAdquiridasComponent } from '../../components/membresias/membresias-adquiridas/membresias-adquiridas.component';
import { GestionServiciosDentalesComponent } from '../../components/servicios-dentales/gestion-servicios-dentales/gestion-servicios-dentales.component';
import { GestionCategoriasDentalesComponent } from '../../components/gestion-categorias-dentales/gestion-categorias-dentales.component';
import { CorteDiarioComponent } from '../../components/corte-diario/corte-diario.component';
import { GestionPromocionesComponent } from '../../components/gestion-promociones/gestion-promociones.component';

@Component({
  selector: 'app-gestion',
  standalone: true,
  imports: [
    CommonModule, 
    GestionServiciosComponent, 
    GestionCategoriasComponent, 
    GestionMembresiasComponent, 
    MembresiasAdquiridasComponent, 
    GestionServiciosDentalesComponent, 
    GestionCategoriasDentalesComponent,
    CorteDiarioComponent,
    GestionPromocionesComponent
  ],
  templateUrl: './gestion.component.html',
  styleUrl: './gestion.component.css'
})
export class GestionComponent {
  tabActivo: 'servicios' | 'serviciosDentales' | 'membresias' | 'suscripciones' | 'corteDiario' | 'promociones' = 'servicios';

  cambiarTab(tab: 'servicios' | 'serviciosDentales' | 'membresias' | 'suscripciones' | 'corteDiario' | 'promociones'): void {
    this.tabActivo = tab;
  }
}
