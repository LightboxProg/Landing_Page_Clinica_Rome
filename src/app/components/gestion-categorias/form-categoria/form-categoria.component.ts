import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './form-categoria.component.html',
  styleUrl: './form-categoria.component.css'
})
export class FormCategoriaComponent {
  @Input() editandoId: string | null = null;
  @Input() formData = { nombre: '', descripcion: '' };
  @Input() guardando = false;
  @Input() mensajeError = '';

  @Output() guardar = new EventEmitter<{ nombre: string; descripcion: string }>();
  @Output() cancelar = new EventEmitter<void>();

  onGuardar(): void {
    if (!this.formData.nombre.trim()) {
      this.mensajeError = 'El nombre es obligatorio';
      return;
    }
    this.guardar.emit({ ...this.formData });
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
