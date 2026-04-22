import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiciosService } from '../../../services/servicios/servicios.service';
import { CategoriasService } from '../../../services/categorias/categorias.service';
import { ListaServiciosComponent } from '../lista-servicios/lista-servicios.component';
import { ModalServicioComponent } from '../modal-servicio/modal-servicio.component';

@Component({
  selector: 'app-gestion-servicios',
  standalone: true,
  imports: [CommonModule, ListaServiciosComponent, ModalServicioComponent],
  templateUrl: './gestion-servicios.component.html',
  styleUrl: './gestion-servicios.component.css'
})
export class GestionServiciosComponent implements OnInit {
  @ViewChild('modalServicio') modalServicio!: ModalServicioComponent;

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
    private serviciosService: ServiciosService,
    private categoriasService: CategoriasService
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
    this.fotoExistente = serv.foto || null;
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

  cargarServiciosPorDefecto(): void {
    if (!confirm('¿Deseas cargar las categorías y servicios por defecto? Se agregarán solo los que no existan.')) {
      return;
    }
    this.cargandoSeed = true;
    this.serviciosService.seedServicios().subscribe({
      next: (res) => {
        this.mensajeExito = res.mensaje;
        this.cargarDatos();
        this.cargandoSeed = false;
      },
      error: (err) => {
        this.mensajeError = err.error?.mensaje || 'Error al cargar datos por defecto';
        this.cargandoSeed = false;
      }
    });
  }
}
