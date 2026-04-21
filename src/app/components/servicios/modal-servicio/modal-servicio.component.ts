import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal-servicio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-servicio.component.html',
  styleUrl: './modal-servicio.component.css'
})
export class ModalServicioComponent {
  @Input() visible = false;
  @Input() editandoId: string | null = null;
  @Input() categorias: any[] = [];
  @Input() guardando = false;
  @Input() mensajeError = '';
  @Input() fotoExistente: any = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<FormData>();

  formData: any = {
    nombre: '', categoria: '', descripcion: '', costo: null,
    duracion: '', palabrasClave: '', beneficios: '', activo: true
  };

  fotoSeleccionada: File | null = null;
  fotoPreview: string | null = null;
  audioSeleccionado: File | null = null;
  audioNombre = '';

  /** Called by parent to set form data when editing */
  setFormData(data: any): void {
    this.formData = { ...data };
  }

  resetForm(): void {
    this.formData = {
      nombre: '', categoria: '', descripcion: '', costo: null,
      duracion: '', palabrasClave: '', beneficios: '', activo: true
    };
    this.limpiarArchivos();
  }

  // ===== File handling =====
  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fotoSeleccionada = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.fotoPreview = e.target?.result as string;
      reader.readAsDataURL(input.files[0]);
    }
  }

  removerFotoNueva(): void {
    this.fotoSeleccionada = null;
    this.fotoPreview = null;
  }

  onAudioSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.audioSeleccionado = input.files[0];
      this.audioNombre = input.files[0].name;
    }
  }

  removerAudio(): void {
    this.audioSeleccionado = null;
    this.audioNombre = '';
  }

  limpiarArchivos(): void {
    this.fotoSeleccionada = null;
    this.fotoPreview = null;
    this.audioSeleccionado = null;
    this.audioNombre = '';
  }

  onCerrar(): void {
    this.limpiarArchivos();
    this.cerrar.emit();
  }

  onGuardar(): void {
    if (!this.formData.nombre?.trim() || !this.formData.categoria || !this.formData.descripcion?.trim() || !this.formData.costo) {
      return; // parent will set mensajeError
    }

    const fd = new FormData();
    fd.append('nombre', this.formData.nombre.trim());
    fd.append('categoria', this.formData.categoria);
    fd.append('descripcion', this.formData.descripcion.trim());
    fd.append('costo', String(Number(this.formData.costo)));
    fd.append('duracion', this.formData.duracion?.trim() || '');
    fd.append('activo', String(this.formData.activo));

    if (this.formData.palabrasClave?.trim()) {
      const arr = this.formData.palabrasClave.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      fd.append('palabrasClave', JSON.stringify(arr));
    }
    if (this.formData.beneficios?.trim()) {
      const arr = this.formData.beneficios.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      fd.append('beneficios', JSON.stringify(arr));
    }

    if (this.fotoSeleccionada) fd.append('foto', this.fotoSeleccionada, this.fotoSeleccionada.name);
    if (this.audioSeleccionado) fd.append('audio', this.audioSeleccionado, this.audioSeleccionado.name);

    this.guardar.emit(fd);
  }
}
