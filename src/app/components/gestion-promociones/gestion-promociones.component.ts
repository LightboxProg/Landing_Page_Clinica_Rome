import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Promocion, PromocionesService } from '../../services/promociones/promociones.service';
import { CategoriasService } from '../../services/categorias/categorias.service';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { SwalService } from '../../services/swal/swal.service';

@Component({
  selector: 'app-gestion-promociones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-promociones.component.html',
  styleUrl: './gestion-promociones.component.css'
})
export class GestionPromocionesComponent implements OnInit, OnDestroy {
  promociones: any[] = [];
  categorias: any[] = [];
  servicios: any[] = [];

  // Formulario de creación
  nuevaPromo: Partial<Promocion> = {
    nombre: '',
    descripcion: '',
    tipoDescuento: 'Monto',
    valorDescuento: 0,
    fechaInicio: '',
    fechaFin: '',
    activo: true
  };

  alcance: 'Servicio' | 'Categoria' = 'Servicio';
  seleccionServicioId: string = '';
  seleccionCategoriaId: string = '';
  fotosSeleccionadas: File[] = [];
  fotosPreviews: string[] = [];

  cargando = false;
  timerInterval: any = null;

  constructor(
    private promosService: PromocionesService,
    private categoriasService: CategoriasService,
    private serviciosService: ServiciosService,
    private swal: SwalService
  ) {}

  ngOnInit(): void {
    this.cargarPromociones();
    this.cargarCategorias();
    this.cargarServicios();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  cargarPromociones(): void {
    this.cargando = true;
    this.promosService.obtenerPromociones().subscribe({
      next: (data: any[]) => {
        this.promociones = data;
        this.cargando = false;
        this.iniciarContadoresRegresivos();
      },
      error: (err) => {
        this.swal.error('Error al cargar promociones');
        this.cargando = false;
      }
    });
  }

  cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => this.categorias = data,
      error: (err) => console.error(err)
    });
  }

  cargarServicios(): void {
    this.serviciosService.obtenerServicios().subscribe({
      next: (data) => {
        // Manejar estructura de retorno si es un objeto o array
        this.servicios = Array.isArray(data) ? data : (data.servicios || []);
      },
      error: (err) => console.error(err)
    });
  }

  onFotoSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      // Guardar todos los archivos seleccionados
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        this.fotosSeleccionadas.push(file);
        
        const reader = new FileReader();
        reader.onload = () => {
          this.fotosPreviews.push(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async guardarPromocion(): Promise<void> {
    if (!this.nuevaPromo.nombre || !this.nuevaPromo.fechaInicio || !this.nuevaPromo.fechaFin) {
      this.swal.error('Por favor completa los campos obligatorios');
      return;
    }

    try {
      const fotosBase64: any[] = [];
      if (this.fotosSeleccionadas && this.fotosSeleccionadas.length > 0) {
        for (const file of this.fotosSeleccionadas) {
          const base64Data = await this.fileToBase64(file);
          fotosBase64.push({
            name: file.name,
            type: file.type,
            data: base64Data
          });
        }
      }

      const payload = {
        nombre: this.nuevaPromo.nombre,
        descripcion: this.nuevaPromo.descripcion || '',
        tipoDescuento: this.nuevaPromo.tipoDescuento || 'Monto',
        valorDescuento: this.nuevaPromo.valorDescuento || 0,
        fechaInicio: this.nuevaPromo.fechaInicio,
        fechaFin: this.nuevaPromo.fechaFin,
        activo: this.nuevaPromo.activo,
        servicioId: this.alcance === 'Servicio' ? this.seleccionServicioId : undefined,
        categoriaId: this.alcance === 'Categoria' ? this.seleccionCategoriaId : undefined,
        fotosBase64
      };

      this.promosService.crearPromocion(payload).subscribe({
        next: () => {
          this.swal.success('Promoción creada exitosamente');
          this.cargarPromociones();
          this.resetForm();
        },
        error: (err) => {
          this.swal.error('Error al crear la promoción');
          console.error(err);
        }
      });
    } catch (err) {
      console.error('[DEBUG FRONTEND] Error en procesamiento de fotos:', err);
      this.swal.error('Error al procesar las fotos seleccionadas');
    }
  }

  eliminarPromocion(id: string): void {
    this.swal.confirm('¿Estás seguro de eliminar esta promoción?').then((result: any) => {
      if (result.isConfirmed) {
        this.promosService.eliminarPromocion(id).subscribe({
          next: () => {
            this.swal.success('Promoción eliminada');
            this.cargarPromociones();
          },
          error: (err) => this.swal.error('Error al eliminar la promoción')
        });
      }
    });
  }

  // Inicializa un temporizador de actualización cada segundo para las cuentas regresivas
  iniciarContadoresRegresivos(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    const actualizar = () => {
      const ahora = new Date().getTime();
      this.promociones.forEach(p => {
        const inicio = new Date(p.fechaInicio).getTime();
        const fin = new Date(p.fechaFin).getTime();

        if (ahora < inicio) {
          const diff = inicio - ahora;
          p.estadoTimer = 'proximamente';
          p.tiempoRestanteStr = `Inicia en: ${this.calcularDiferenciaTiempo(diff)}`;
        } else if (ahora >= inicio && ahora <= fin) {
          const diff = fin - ahora;
          p.estadoTimer = 'activo';
          p.tiempoRestanteStr = `Termina en: ${this.calcularDiferenciaTiempo(diff)}`;
        } else {
          p.estadoTimer = 'expirado';
          p.tiempoRestanteStr = 'Campañana Finalizada';
        }
      });
    };

    actualizar();
    this.timerInterval = setInterval(actualizar, 1000);
  }

  // Formatea milisegundos en dias, horas, minutos y segundos
  calcularDiferenciaTiempo(milisegundos: number): string {
    const dias = Math.floor(milisegundos / (1000 * 60 * 60 * 24));
    const horas = Math.floor((milisegundos % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((milisegundos % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((milisegundos % (1000 * 60)) / 1000);

    const parts = [];
    if (dias > 0) parts.push(`${dias}d`);
    parts.push(`${horas.toString().padStart(2, '0')}h`);
    parts.push(`${minutos.toString().padStart(2, '0')}m`);
    parts.push(`${segundos.toString().padStart(2, '0')}s`);

    return parts.join(' ');
  }

  resetForm(): void {
    this.nuevaPromo = {
      nombre: '',
      descripcion: '',
      tipoDescuento: 'Monto',
      valorDescuento: 0,
      fechaInicio: '',
      fechaFin: '',
      activo: true
    };
    this.seleccionServicioId = '';
    this.seleccionCategoriaId = '';
    this.alcance = 'Servicio';
    this.fotosSeleccionadas = [];
    this.fotosPreviews = [];
    
    // Solución al bug del evento change de Angular: limpiar el valor del input file del DOM
    const fileInput = document.getElementById('file-promo-photo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}
