import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriasService } from '../../services/categorias/categorias.service';
import { ListaCategoriasComponent } from './lista-categorias/lista-categorias.component';
import { FormCategoriaComponent } from './form-categoria/form-categoria.component';

@Component({
  selector: 'app-gestion-categorias',
  standalone: true,
  imports: [CommonModule, ListaCategoriasComponent, FormCategoriaComponent],
  templateUrl: './gestion-categorias.component.html',
  styleUrl: './gestion-categorias.component.css'
})
export class GestionCategoriasComponent implements OnInit {
  @Output() categoriasCambiaron = new EventEmitter<void>();

  categorias: any[] = [];
  loading = true;

  mostrarFormulario = false;
  editandoId: string | null = null;
  formData = { nombre: '', descripcion: '' };
  guardando = false;
  mensajeError = '';
  mensajeExito = '';

  constructor(private categoriasService: CategoriasService) {}

  ngOnInit(): void {
    this.cargarCategorias();
  }

  cargarCategorias(): void {
    this.loading = true;
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => { this.categorias = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  abrirFormularioNuevo(): void {
    this.editandoId = null;
    this.formData = { nombre: '', descripcion: '' };
    this.mostrarFormulario = true;
    this.limpiarMensajes();
  }

  onEditar(cat: any): void {
    this.editandoId = cat._id;
    this.formData = { nombre: cat.nombre, descripcion: cat.descripcion || '' };
    this.mostrarFormulario = true;
    this.limpiarMensajes();
  }

  onCancelar(): void {
    this.mostrarFormulario = false;
    this.editandoId = null;
    this.formData = { nombre: '', descripcion: '' };
    this.limpiarMensajes();
  }

  onGuardar(data: { nombre: string; descripcion: string }): void {
    this.guardando = true;
    this.limpiarMensajes();

    if (this.editandoId) {
      this.categoriasService.actualizarCategoria(this.editandoId, data).subscribe({
        next: () => {
          this.mensajeExito = 'Categoría actualizada';
          this.guardando = false;
          this.onCancelar();
          this.cargarCategorias();
          this.categoriasCambiaron.emit();
        },
        error: (err) => { this.mensajeError = err.error?.error || 'Error al actualizar'; this.guardando = false; }
      });
    } else {
      this.categoriasService.crearCategoria(data).subscribe({
        next: () => {
          this.mensajeExito = 'Categoría creada';
          this.guardando = false;
          this.onCancelar();
          this.cargarCategorias();
          this.categoriasCambiaron.emit();
        },
        error: (err) => { this.mensajeError = err.error?.error || 'Error al crear'; this.guardando = false; }
      });
    }
  }

  onEliminar(cat: any): void {
    this.categoriasService.eliminarCategoria(cat._id).subscribe({
      next: () => { this.cargarCategorias(); this.categoriasCambiaron.emit(); },
      error: (err) => console.error('Error al eliminar categoría:', err)
    });
  }

  private limpiarMensajes(): void {
    this.mensajeError = '';
    this.mensajeExito = '';
  }
}
