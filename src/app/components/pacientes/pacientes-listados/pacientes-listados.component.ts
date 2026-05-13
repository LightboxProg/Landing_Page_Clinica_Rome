import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListaNegra, ListaNegraService } from '../../../services/lista-negra/lista-negra.service';
import { Paciente } from '../../../services/pacientes/pacientes.service';

@Component({
  selector: 'app-pacientes-listados',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pacientes-listados.component.html',
  styleUrl: './pacientes-listados.component.scss'
})
export class PacientesListadosComponent implements OnInit {
  listaNegra: (ListaNegra & { paciente: Paciente })[] = [];

  constructor(private listaNegraService: ListaNegraService) {}

  ngOnInit() {
    this.listaNegraService.obtenerTodas().subscribe(res => {
      this.listaNegra = res.data.filter(item => typeof item.paciente !== 'string') as any;
    });
  }
}