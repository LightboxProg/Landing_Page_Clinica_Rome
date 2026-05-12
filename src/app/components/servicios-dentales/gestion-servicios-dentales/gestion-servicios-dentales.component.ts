import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiciosDentalesService } from '../../../services/servicios-dentales/servicios-dentales.service';
import { CategoriasDentalesService } from '../../../services/categorias-dentales/categorias-dentales.service';
import { ListaServiciosDentalesComponent } from '../lista-servicios-dentales/lista-servicios-dentales.component';
import { ModalServicioDentalComponent } from '../modal-servicio-dental/modal-servicio-dental.component';

@Component({
  selector: 'app-gestion-servicios-dentales',
  standalone: true,
  imports: [CommonModule, ListaServiciosDentalesComponent, ModalServicioDentalComponent],
  templateUrl: './gestion-servicios-dentales.component.html',
  styleUrl: './gestion-servicios-dentales.component.css'
})
export class GestionServiciosDentalesComponent implements OnInit {
  @ViewChild('modalServicio') modalServicio!: ModalServicioDentalComponent;

  servicios: any[] = [];
  categorias: any[] = [];
  loading = true;

  mostrarModal = false;
  editandoId: string | null = null;
  guardando = false;
  mensajeError = '';
  mensajeExito = '';
  fotoExistente: any = null;
  cargandoSeed = false;

  constructor(
    private serviciosService: ServiciosDentalesService,
    private categoriasService: CategoriasDentalesService
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.serviciosService.obtenerServicios().subscribe({
      next: (data) => { this.servicios = data; this.loading = false; },
      error: () => this.loading = false
    });
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => this.categorias = data,
      error: (err) => console.error('Error cargando categorías:', err)
    });
  }

  abrirModalNuevo(): void {
    this.editandoId = null;
    this.fotoExistente = null;
    this.mensajeError = '';
    this.mostrarModal = true;
    // Reset form in the child
    setTimeout(() => this.modalServicio?.resetForm());
  }

  onEditar(serv: any): void {
    this.editandoId = serv._id;
    this.fotoExistente = (serv.fotos && serv.fotos.length > 0) ? serv.fotos[0] : null;
    this.mensajeError = '';
    this.mostrarModal = true;
    setTimeout(() => {
      this.modalServicio?.setFormData({
        nombre: serv.nombre,
        categoria: serv.categoria?._id || serv.categoria,
        descripcion: serv.descripcion,
        costo: serv.costo,
        duracion: serv.duracion || '',
        palabrasClave: (serv.palabrasClave || []).join(', '),
        beneficios: (serv.beneficios || []).join(', '),
        activo: serv.activo
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
      this.serviciosService.modificarServicio(this.editandoId, fd).subscribe({
        next: () => {
          this.mensajeExito = 'Servicio actualizado correctamente';
          this.guardando = false;
          this.onCerrarModal();
          this.cargarDatos();
        },
        error: (err) => {
          this.mensajeError = err.error?.mensaje || 'Error al actualizar';
          this.guardando = false;
        }
      });
    } else {
      this.serviciosService.crearServicio(fd).subscribe({
        next: () => {
          this.mensajeExito = 'Servicio creado correctamente';
          this.guardando = false;
          this.onCerrarModal();
          this.cargarDatos();
        },
        error: (err) => {
          this.mensajeError = err.error?.mensaje || 'Error al crear';
          this.guardando = false;
        }
      });
    }
  }

  onEliminar(serv: any): void {
    this.serviciosService.eliminarServicio(serv._id).subscribe({
      next: () => { this.mensajeExito = 'Servicio eliminado'; this.cargarDatos(); },
      error: (err) => console.error('Error al eliminar servicio:', err)
    });
  }


}
