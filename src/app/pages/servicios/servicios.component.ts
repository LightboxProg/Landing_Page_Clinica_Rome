import { Component, OnInit } from '@angular/core';
import { CategoriasService } from '../../services/categorias/categorias.service';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { CommonModule } from '@angular/common';

interface Categoria {
  _id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
}

interface Servicio {
  _id: string;
  nombre: string;
  categoria: string | Categoria;
  descripcion: string;
  costo: number;
  duracion?: string;
  duracionMinutos?: number;
  foto?: { url: string; key: string };
  audio?: { url: string; key: string };
  activo: boolean;
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.css'
})

export class ServiciosComponent implements OnInit {
  categoriasEsteticas: Categoria[] = [];
  serviciosEsteticos: Servicio[] = [];
  serviciosAgrupados: Map<string, Servicio[]> = new Map();
  cargando = true;
  error: string | null = null;

  // Mensaje de plan de pagos (puede venir de BD o permanecer fijo)
  planPagos = {
    anticipo: 1000,
    quincenas: 8,
    mensaje: 'Anticipo de $1,000 MXN + 8 pagos quincenales sin intereses.'
  };

  constructor(
    private serviciosService: ServiciosService,
    private categoriasService: CategoriasService
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    try {
      // Obtener categorías activas
      const categorias = await this.categoriasService.obtenerCategorias().toPromise();
      this.categoriasEsteticas = categorias || [];

      // Obtener servicios activos
      const servicios = await this.serviciosService.obtenerServicios().toPromise();
      this.serviciosEsteticos = servicios || [];

      this.agruparServiciosPorCategoria();
      this.cargando = false;
    } catch (err) {
      console.error('Error al cargar servicios:', err);
      this.error = 'No se pudieron cargar los servicios. Intenta de nuevo más tarde.';
      this.cargando = false;
    }
  }

  agruparServiciosPorCategoria(): void {
    this.serviciosAgrupados.clear();

    // Inicializar mapa con categorías (para mantener orden)
    this.categoriasEsteticas.forEach(cat => {
      if (cat.activa) {
        this.serviciosAgrupados.set(cat._id, []);
      }
    });

    // Distribuir servicios en su categoría correspondiente
    this.serviciosEsteticos.forEach(servicio => {
      if (!servicio.activo) return;

      const catId = typeof servicio.categoria === 'string'
        ? servicio.categoria
        : servicio.categoria._id;

      if (this.serviciosAgrupados.has(catId)) {
        this.serviciosAgrupados.get(catId)!.push(servicio);
      }
    });

    // Eliminar categorías vacías (opcional)
    for (const [catId, servicios] of this.serviciosAgrupados.entries()) {
      if (servicios.length === 0) {
        this.serviciosAgrupados.delete(catId);
      }
    }
  }

  // Obtener nombre de categoría por ID
  getNombreCategoria(categoriaId: string): string {
    const cat = this.categoriasEsteticas.find(c => c._id === categoriaId);
    return cat ? cat.nombre : 'Servicios';
  }

  // Formatear precio en MXN
  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  }

  // Calcular pago quincenal (para el plan de pagos)
  calcularPagoQuincenal(precioTotal: number): number {
    return Math.ceil((precioTotal - this.planPagos.anticipo) / this.planPagos.quincenas);
  }

  // Obtener texto del plan de pagos para un servicio
  getTextoPlanPagos(precioTotal: number): string {
    const quincena = this.calcularPagoQuincenal(precioTotal);
    return `${this.formatearPrecio(this.planPagos.anticipo)} + ${this.planPagos.quincenas} × ${this.formatearPrecio(quincena)}`;
  }

  trackByCategoria(index: number, cat: Categoria): string {
    return cat._id;
  }

  trackByServicio(index: number, servicio: Servicio): string {
    return servicio._id;
  }
}