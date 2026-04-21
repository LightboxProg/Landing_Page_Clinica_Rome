import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-membresias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-membresias.component.html',
  styleUrl: './lista-membresias.component.css'
})
export class ListaMembresiasComponent {
  @Input() catalogos: any[] = [];
  @Input() loading = false;

  @Output() editar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<any>();
  @Output() nuevo = new EventEmitter<void>();

  frecuencias = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' }
  ];

  onEditar(cat: any): void {
    this.editar.emit(cat);
  }

  onEliminar(cat: any): void {
    if (!confirm(`¿Desactivar la membresía "${cat.nombreTratamiento}"?`)) return;
    this.eliminar.emit(cat);
  }

  formatCosto(costo: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(costo);
  }

  getFrecuenciaLabel(value: string): string {
    const f = this.frecuencias.find(fr => fr.value === value);
    return f ? f.label : value;
  }
}
