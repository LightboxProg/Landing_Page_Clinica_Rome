import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  fotoSeleccionada: File | null = null;
  fotoPreview: string | null = null;

  frecuencias = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' }
  ];

  setFormData(data: any): void {
    this.formData = { ...data };
  }

  resetForm(): void {
    this.formData = {
      nombreTratamiento: '', descripcion: '', costoTotal: null,
      enganche: null, paymentFrequency: 'mensual', installmentsCount: null
    };
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
    if (costoTotal && enganche && installmentsCount && installmentsCount > 0) {
      return (costoTotal - enganche) / installmentsCount;
    }
    return 0;
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
    if (!nombreTratamiento?.trim() || !costoTotal || !enganche || !paymentFrequency || !installmentsCount) return;

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
