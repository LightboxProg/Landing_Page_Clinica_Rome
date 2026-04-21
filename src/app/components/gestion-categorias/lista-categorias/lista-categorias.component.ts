import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-categorias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-categorias.component.html',
  styleUrl: './lista-categorias.component.css'
})
export class ListaCategoriasComponent {
  @Input() categorias: any[] = [];
  @Input() loading = false;

  @Output() editar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<any>();

  onEditar(cat: any): void {
    this.editar.emit(cat);
  }

  onEliminar(cat: any): void {
    if (!confirm(`¿Desactivar la categoría "${cat.nombre}"?`)) return;
    this.eliminar.emit(cat);
  }
}
