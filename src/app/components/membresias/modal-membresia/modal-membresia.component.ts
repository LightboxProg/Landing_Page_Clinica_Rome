import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { calcularCuota } from '../../../services/membresias/membresias.service';

@Component({
  selector: 'app-modal-membresia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-membresia.component.html',
  styleUrl: './modal-membresia.component.css'
})
export class ModalMembresiaComponent {
  @Input() visible = false;
  @Input() editandoId: string | null = null;
  @Input() guardando = false;
  @Input() mensajeError = '';
  @Input() fotoExistenteUrl: string | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<FormData>();

  formData: any = {
    nombreTratamiento: '', descripcion: '', costoTotal: null,
    enganche: null, paymentFrequency: 'mensual', installmentsCount: null
  };

  errorValidacion = '';
  fotoSeleccionada: File | null = null;
  fotoPreview: string | null = null;

  frecuencias = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' }
  ];

  setFormData(data: any): void {
    this.formData = { ...data };
    this.errorValidacion = '';
  }

  resetForm(): void {
    this.formData = {
      nombreTratamiento: '', descripcion: '', costoTotal: null,
      enganche: null, paymentFrequency: 'mensual', installmentsCount: null
    };
    this.errorValidacion = '';
    this.limpiarFoto();
  }

  // ===== Photo handling =====
  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fotoSeleccionada = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => this.fotoPreview = e.target?.result as string;
      reader.readAsDataURL(input.files[0]);
    }
  }

  removerFoto(): void {
    this.fotoSeleccionada = null;
    this.fotoPreview = null;
  }

  limpiarFoto(): void {
    this.fotoSeleccionada = null;
    this.fotoPreview = null;
  }

  calcularParcialidad(): number {
    const { costoTotal, enganche, installmentsCount } = this.formData;
    if (costoTotal && enganche && installmentsCount && installmentsCount > 0 && enganche < costoTotal) {
      return calcularCuota(costoTotal, enganche, installmentsCount);
    }
    return 0;
  }

  // Mismas reglas que el backend, para avisar antes de enviar
  private validar(): string {
    const { nombreTratamiento, costoTotal, enganche, installmentsCount } = this.formData;
    if (!nombreTratamiento?.trim()) return 'Escribe el nombre del tratamiento.';
    if (!(Number(costoTotal) > 0)) return 'El costo total debe ser mayor a 0.';
    if (!(Number(enganche) > 0)) return 'El enganche debe ser mayor a 0: es lo que se cobra al contratar.';
    if (Number(enganche) >= Number(costoTotal)) return 'El enganche debe ser menor al costo total.';
    const cuotas = Number(installmentsCount);
    if (!Number.isInteger(cuotas) || cuotas < 1 || cuotas > 104) return 'Las parcialidades deben ser un número entero entre 1 y 104.';
    return '';
  }

  formatCosto(costo: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(costo);
  }

  onCerrar(): void {
    this.limpiarFoto();
    this.cerrar.emit();
  }

  onGuardar(): void {
    const { nombreTratamiento, costoTotal, enganche, paymentFrequency, installmentsCount } = this.formData;
    this.errorValidacion = this.validar();
    if (this.errorValidacion) return;

    const fd = new FormData();
    fd.append('nombreTratamiento', nombreTratamiento.trim());
    fd.append('descripcion', this.formData.descripcion?.trim() || '');
    fd.append('costoTotal', String(Number(costoTotal)));
    fd.append('enganche', String(Number(enganche)));
    fd.append('paymentFrequency', paymentFrequency);
    fd.append('installmentsCount', String(Number(installmentsCount)));

    if (this.fotoSeleccionada) {
      fd.append('photo', this.fotoSeleccionada, this.fotoSeleccionada.name);
    }

    this.guardar.emit(fd);
  }
}
