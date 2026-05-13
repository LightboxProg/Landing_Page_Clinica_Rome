import { Component, OnInit } from '@angular/core';
import { Paciente, PacientesService } from '../../../services/pacientes/pacientes.service';
import { ElementPacienteComponent } from '../element-paciente/element-paciente.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-pacientes',
  standalone: true,
  imports: [CommonModule, ElementPacienteComponent],
  templateUrl: './lista-pacientes.component.html',
  styleUrl: './lista-pacientes.component.scss'
})
export class ListaPacientesComponent implements OnInit {
  pacientes: Paciente[] = [];

  constructor(private pacientesService: PacientesService) {}

  ngOnInit() {
    this.pacientesService.pacientes$.subscribe(data => this.pacientes = data);
    this.pacientesService.obtenerPacientes();
  }
}