import { Component, OnInit } from '@angular/core';
import { Paciente, PacientesService } from '../../../services/pacientes/pacientes.service';
import { ElementPacienteComponent } from '../element-paciente/element-paciente.component';
import { CommonModule } from '@angular/common';

// Son miles de pacientes: pintar todas las tarjetas de golpe congela la página
const POR_PAGINA = 30;

@Component({
  selector: 'app-lista-pacientes',
  standalone: true,
  imports: [CommonModule, ElementPacienteComponent],
  templateUrl: './lista-pacientes.component.html',
  styleUrl: './lista-pacientes.component.scss'
})
export class ListaPacientesComponent implements OnInit {
  pacientes: Paciente[] = [];
  visibles: Paciente[] = [];

  constructor(private pacientesService: PacientesService) {}

  ngOnInit() {
    this.pacientesService.pacientes$.subscribe(data => {
      this.pacientes = data;
      this.visibles = data.slice(0, POR_PAGINA);
    });
    this.pacientesService.obtenerPacientes();
  }

  get restantes(): number {
    return this.pacientes.length - this.visibles.length;
  }

  verMas() {
    this.visibles = this.pacientes.slice(0, this.visibles.length + POR_PAGINA);
  }

  porId(_: number, paciente: Paciente) {
    return paciente._id;
  }
}