import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PacientesService } from '../../../services/pacientes/pacientes.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filtros-pacientes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './filtros-pacientes.component.html',
  styleUrl: './filtros-pacientes.component.scss'
})
export class FiltrosPacientesComponent implements OnInit {
  filterForm!: FormGroup;

  constructor(private fb: FormBuilder, private pacientesService: PacientesService) {}

  ngOnInit() {
    this.filterForm = this.fb.group({ search: [''] });
  }

  obtenerFiltrosPacientes() {
    const telefono = this.filterForm.get('search')?.value;
    if (telefono && telefono.trim() !== '') {
      this.pacientesService.buscarPorTelefono(telefono).subscribe({
        next: (res) => {
          const pacientes = Array.isArray(res) ? res : [res];
          this.pacientesService.actualizarLista(pacientes);
        },
        error: () => this.pacientesService.actualizarLista([])
      });
    } else {
      this.pacientesService.obtenerPacientes();
    }
  }
}