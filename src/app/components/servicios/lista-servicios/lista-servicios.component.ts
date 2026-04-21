import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-servicios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-servicios.component.html',
  styleUrl: './lista-servicios.component.css'
})
export class ListaServiciosComponent {
  @Input() servicios: any[] = [];
  @Input() categorias: any[] = [];
  @Input() loading = false;

  @Output() editar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<any>();
  @Output() nuevo = new EventEmitter<void>();

  onEditar(serv: any): void {
    this.editar.emit(serv);
  }

  onEliminar(serv: any): void {
    if (!confirm(`¿Eliminar el servicio "${serv.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.eliminar.emit(serv);
  }

  getNombreCategoria(serv: any): string {
    if (serv.categoria && typeof serv.categoria === 'object') return serv.categoria.nombre;
    const cat = this.categorias.find(c => c._id === serv.categoria);
    return cat ? cat.nombre : 'Sin categoría';
  }

  tieneFoto(serv: any): boolean {
    return !!(serv.foto && serv.foto.url);
  }

  tieneAudio(serv: any): boolean {
    return !!(serv.audio && serv.audio.url);
  }

  formatCosto(costo: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(costo);
  }
}
