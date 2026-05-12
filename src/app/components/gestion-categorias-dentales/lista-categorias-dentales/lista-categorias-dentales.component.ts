import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-categorias-dentales',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-categorias-dentales.component.html',
  styleUrl: './lista-categorias-dentales.component.css'
})
export class ListaCategoriasDentalesComponent {
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
