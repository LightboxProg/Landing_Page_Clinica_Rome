import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembresiasService } from '../../../services/membresias/membresias.service';
import { ListaMembresiasComponent } from '../lista-membresias/lista-membresias.component';
import { ModalMembresiaComponent } from '../modal-membresia/modal-membresia.component';

@Component({
  selector: 'app-gestion-membresias',
  standalone: true,
  imports: [CommonModule, ListaMembresiasComponent, ModalMembresiaComponent],
  templateUrl: './gestion-membresias.component.html',
  styleUrl: './gestion-membresias.component.css'
})
export class GestionMembresiasComponent implements OnInit {
  @ViewChild('modalMembresia') modalMembresia!: ModalMembresiaComponent;

  catalogos: any[] = [];
  loading = true;

  mostrarModal = false;
  editandoId: string | null = null;
  guardando = false;
  mensajeError = '';
  mensajeExito = '';
  fotoExistenteUrl: string | null = null;

  constructor(private membresiasService: MembresiasService) { }

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.loading = true;
    this.membresiasService.obtenerCatalogos().subscribe({
      next: (response) => { this.catalogos = response.catalogos || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  abrirModalNuevo(): void {
    this.editandoId = null;
    this.fotoExistenteUrl = null;
    this.mensajeError = '';
    this.mostrarModal = true;
    setTimeout(() => this.modalMembresia?.resetForm());
  }

  onEditar(cat: any): void {
    this.editandoId = cat._id;
    this.fotoExistenteUrl = cat.photoUrl || null;
    this.mensajeError = '';
    this.mostrarModal = true;
    setTimeout(() => {
      this.modalMembresia?.setFormData({
        nombreTratamiento: cat.nombreTratamiento,
        descripcion: cat.descripcion || '',
        costoTotal: cat.costoTotal,
        enganche: cat.enganche,
        paymentFrequency: cat.paymentFrequency,
        installmentsCount: cat.installmentsCount
      });
    });
  }

  onCerrarModal(): void {
    this.mostrarModal = false;
    this.editandoId = null;
    this.mensajeError = '';
  }

  onGuardar(fd: FormData): void {
    this.guardando = true;
    this.mensajeError = '';

    if (this.editandoId) {
      this.membresiasService.actualizarCatalogo(this.editandoId, fd).subscribe({
        next: () => {
          this.mensajeExito = 'Membresía actualizada correctamente';
          this.guardando = false;
          this.onCerrarModal();
          this.cargarCatalogos();
        },
        error: (err) => {
          this.mensajeError = err.error?.message || 'Error al actualizar';
          this.guardando = false;
        }
      });
    } else {
      this.membresiasService.crearCatalogo(fd).subscribe({
        next: () => {
          this.mensajeExito = 'Membresía creada correctamente';
          this.guardando = false;
          this.onCerrarModal();
          this.cargarCatalogos();
        },
        error: (err) => {
          this.mensajeError = err.error?.message || 'Error al crear';
          this.guardando = false;
        }
      });
    }
  }

  onEliminar(cat: any): void {
    this.membresiasService.eliminarCatalogo(cat._id).subscribe({
      next: () => { this.mensajeExito = 'Membresía desactivada'; this.cargarCatalogos(); },
      error: (err) => console.error('Error:', err)
    });
  }
}
