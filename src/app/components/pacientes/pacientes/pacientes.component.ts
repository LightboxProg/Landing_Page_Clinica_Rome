import { Component } from '@angular/core';
import { ListaPacientesComponent } from '../lista-pacientes/lista-pacientes.component';
import { FiltrosPacientesComponent } from '../filtros-pacientes/filtros-pacientes.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FiltrosPacientesComponent, ListaPacientesComponent],
  templateUrl: './pacientes.component.html',
  styleUrl: './pacientes.component.scss'
})
export class PacientesComponent {

}
