import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { CategoriasService } from '../../services/categorias/categorias.service';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { CategoriasDentalesService } from '../../services/categorias-dentales/categorias-dentales.service';
import { ServiciosDentalesService } from '../../services/servicios-dentales/servicios-dentales.service';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../directives/reveal.directive';

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
  fotos?: { url: string; key: string }[];
  audio?: { url: string; key: string };
  activo: boolean;
}

/* La vista del tarifario. El template lee de aquí y sólo de aquí: nada de
   filtrar, ordenar ni formatear dentro del HTML, que en Angular se vuelve a
   ejecutar en cada ciclo de detección de cambios. */
interface FilaTarifa {
  id: string;
  nombre: string;
  variante: string | null;
  descripcion?: string;
  precio: string;
  duracion?: string;
  foto?: string;
}

interface BloqueTarifa {
  id: string;
  ancla: string;
  nombre: string;
  descripcion?: string;
  desde: string;
  filas: FilaTarifa[];
}

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  templateUrl: './servicios.component.html',
  styleUrl: './servicios.component.css'
})

export class ServiciosComponent implements OnInit, OnDestroy {
  // Datos Estéticos (API Backend)
  categoriasEsteticas: Categoria[] = [];
  serviciosEsteticos: Servicio[] = [];
  serviciosAgrupados: Map<string, Servicio[]> = new Map();

  // Datos Dentales (API Backend)
  categoriasDentalesApi: Categoria[] = [];
  serviciosDentalesApi: Servicio[] = [];
  serviciosDentalesAgrupados: Map<string, Servicio[]> = new Map();

  cargando = true;
  error: string | null = null;

  // Estado del switch: 'esteticos' | 'dentales'
  tipoServicioActivo: 'esteticos' | 'dentales' = 'esteticos';

  // Tarifario ya construido para la rama activa, y la categoría que el índice
  // marca como "en pantalla".
  tarifario: BloqueTarifa[] = [];
  anclaActiva: string | null = null;

  private observador?: IntersectionObserver;

  // Categorías y servicios dentales por defecto (fallback en caso de que la BD no tenga datos iniciales)
  categoriasDentalesDefault = [
    {
      titulo: 'Estética Dental & Diseño de Sonrisa',
      icon: 'fa-tooth',
      descripcion: 'Procedimientos para transformar la apariencia, color y simetría de tus dientes.',
      servicios: [
        { nombre: 'Blanqueamiento Dental LED / Láser', costo: 3500, duracion: '45 min', descripcion: 'Aclarado clínico intensivo de alta efectividad sin dañar el esmalte.' },
        { nombre: 'Carillas de Resina de Alta Estética', costo: 12000, duracion: '90 min', descripcion: 'Diseño de sonrisa directo en resina microhíbrida de durabilidad superior.' },
        { nombre: 'Carillas de Porcelana / Disilicato', costo: 24000, duracion: '2 sesiones', descripcion: 'Láminas ultrasensibles de porcelana pura para una sonrisa perfecta y permanente.' },
        { nombre: 'Limpieza Dental Ultrasónica Pro', costo: 1200, duracion: '30 min', descripcion: 'Eliminación de sarro, manchado y pulido profiláctico especializado.' }
      ]
    },
    {
      titulo: 'Ortodoncia & Alineación',
      icon: 'fa-teeth-open',
      descripcion: 'Corrección de la postura dental con sistemas convencionales e invisibles.',
      servicios: [
        { nombre: 'Alineadores Invisibles (Invisalign)', costo: 32000, duracion: 'Valoración previa', descripcion: 'Tratamiento estético transparente para alinear dientes sin brackets tradicionales.' },
        { nombre: 'Brackets Estéticos de Zafiro', costo: 18000, duracion: 'Ajuste mensual', descripcion: 'Brackets transparentes de alta discreción visual y resistencia.' },
        { nombre: 'Brackets Metálicos Tradicionales', costo: 12000, duracion: 'Ajuste mensual', descripcion: 'Sistema de corrección ortodóncica estándar de alta precisión.' }
      ]
    },
    {
      titulo: 'Odontología General & Restauradora',
      icon: 'fa-shield-halved',
      descripcion: 'Restauración de la salud oral, calzas estéticas y prevención integral.',
      servicios: [
        { nombre: 'Resinas Estéticas (Calzas del color del diente)', costo: 950, duracion: '30 min', descripcion: 'Restauración estética directa libre de amalgama metálica.' },
        { nombre: 'Endodoncia Unirradicular / Multirradicular', costo: 3800, duracion: '60 min', descripcion: 'Tratamiento de conductos preservando la pieza dental natural.' },
        { nombre: 'Corona de Zirconio Monolítico', costo: 6500, duracion: '2 sesiones', descripcion: 'Prótesis fija biocompatible de máxima dureza y aspecto natural.' },
        { nombre: 'Extracción Dental Simple / Quirúrgica', costo: 1500, duracion: '45 min', descripcion: 'Procedimiento de exodoncia asistido con anestesia tópica y local.' }
      ]
    }
  ];

  constructor(
    private serviciosService: ServiciosService,
    private categoriasService: CategoriasService,
    private serviciosDentalesService: ServiciosDentalesService,
    private categoriasDentalesService: CategoriasDentalesService,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.observador?.disconnect();
  }

  seleccionarTipoServicio(tipo: 'esteticos' | 'dentales'): void {
    if (this.tipoServicioActivo === tipo) return;
    this.tipoServicioActivo = tipo;
    this.construirTarifario();
  }

  async cargarDatos(): Promise<void> {
    try {
      // 1. Obtener datos Estéticos
      const [categoriasEst, serviciosEst] = await Promise.all([
        this.categoriasService.obtenerCategorias().toPromise(),
        this.serviciosService.obtenerServicios().toPromise()
      ]);
      this.categoriasEsteticas = categoriasEst || [];
      this.serviciosEsteticos = serviciosEst || [];
      this.agruparServiciosEsteticos();

      // 2. Obtener datos Dentales desde Backend (modelos categoriasDentales y serviciosDentales)
      try {
        const [categoriasDent, serviciosDent] = await Promise.all([
          this.categoriasDentalesService.obtenerCategorias().toPromise(),
          this.serviciosDentalesService.obtenerServicios().toPromise()
        ]);
        this.categoriasDentalesApi = categoriasDent || [];
        this.serviciosDentalesApi = serviciosDent || [];
        this.agruparServiciosDentales();
      } catch (dentalErr) {
        console.warn('Error al cargar datos dentales desde backend, usando estructura de catálogo:', dentalErr);
      }

      this.cargando = false;
      this.construirTarifario();
    } catch (err) {
      console.error('Error al cargar servicios:', err);
      this.error = 'No se pudieron cargar los servicios. Intenta de nuevo más tarde.';
      this.cargando = false;
    }
  }

  agruparServiciosEsteticos(): void {
    this.serviciosAgrupados.clear();

    this.categoriasEsteticas.forEach(cat => {
      if (cat.activa) {
        this.serviciosAgrupados.set(cat._id, []);
      }
    });

    this.serviciosEsteticos.forEach(servicio => {
      if (!servicio.activo) return;

      const catObj = typeof servicio.categoria === 'object' ? servicio.categoria : null;
      const catId = catObj ? catObj._id : (servicio.categoria as string);

      if (!catId) return;

      if (!this.serviciosAgrupados.has(catId)) {
        if (catObj) {
          this.categoriasEsteticas.push({ _id: catObj._id, nombre: catObj.nombre, activa: true });
        }
        this.serviciosAgrupados.set(catId, []);
      }

      this.serviciosAgrupados.get(catId)!.push(servicio);
    });

    for (const [catId, servicios] of this.serviciosAgrupados.entries()) {
      if (servicios.length === 0) {
        this.serviciosAgrupados.delete(catId);
      } else {
        this.ordenarPorNombre(servicios);
      }
    }
  }

  agruparServiciosDentales(): void {
    this.serviciosDentalesAgrupados.clear();

    this.categoriasDentalesApi.forEach(cat => {
      if (cat.activa) {
        this.serviciosDentalesAgrupados.set(cat._id, []);
      }
    });

    this.serviciosDentalesApi.forEach(servicio => {
      if (!servicio.activo) return;

      const catObj = typeof servicio.categoria === 'object' ? servicio.categoria : null;
      const catId = catObj ? catObj._id : (servicio.categoria as string);

      if (!catId) return;

      if (!this.serviciosDentalesAgrupados.has(catId)) {
        if (catObj) {
          this.categoriasDentalesApi.push({ _id: catObj._id, nombre: catObj.nombre, activa: true });
        }
        this.serviciosDentalesAgrupados.set(catId, []);
      }

      this.serviciosDentalesAgrupados.get(catId)!.push(servicio);
    });

    for (const [catId, servicios] of this.serviciosDentalesAgrupados.entries()) {
      if (servicios.length === 0) {
        this.serviciosDentalesAgrupados.delete(catId);
      } else {
        this.ordenarPorNombre(servicios);
      }
    }
  }

  /* ------------------------------------------------------------------
     Construcción del tarifario
     Las dos ramas de la clínica y el catálogo dental de respaldo se
     normalizan a la misma forma, así el índice y las filas se dibujan
     una sola vez en el template en lugar de tres veces casi iguales.
     ------------------------------------------------------------------ */
  private construirTarifario(): void {
    this.tarifario = this.tipoServicioActivo === 'esteticos'
      ? this.tarifarioDesdeApi(this.categoriasEsteticas, this.serviciosAgrupados)
      : this.tarifarioDental();

    this.anclaActiva = this.tarifario[0]?.ancla ?? null;

    // Las secciones se dibujan en el siguiente ciclo; hasta entonces no hay
    // nada que observar.
    setTimeout(() => this.observarCategorias());
  }

  private tarifarioDental(): BloqueTarifa[] {
    if (this.serviciosDentalesAgrupados.size > 0) {
      return this.tarifarioDesdeApi(this.categoriasDentalesApi, this.serviciosDentalesAgrupados);
    }

    return this.categoriasDentalesDefault.map((cat, i) => {
      const filas = cat.servicios.map((s, j) => this.aFila(`def-${i}-${j}`, s.nombre, s.descripcion, s.costo, s.duracion));
      return {
        id: `def-${i}`,
        ancla: `cat-def-${i}`,
        nombre: cat.titulo,
        descripcion: cat.descripcion,
        desde: this.formatearPrecio(Math.min(...cat.servicios.map(s => s.costo))),
        filas
      };
    });
  }

  private tarifarioDesdeApi(categorias: Categoria[], agrupados: Map<string, Servicio[]>): BloqueTarifa[] {
    const bloques: BloqueTarifa[] = [];

    for (const cat of categorias) {
      const servicios = agrupados.get(cat._id);
      if (!servicios || servicios.length === 0) continue;

      bloques.push({
        id: cat._id,
        ancla: `cat-${cat._id}`,
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        desde: this.formatearPrecio(Math.min(...servicios.map(s => s.costo))),
        filas: servicios.map(s => this.aFila(s._id, s.nombre, s.descripcion, s.costo, s.duracion, this.fotoDe(s)))
      });
    }

    return bloques;
  }

  private aFila(id: string, nombre: string, descripcion: string | undefined, costo: number, duracion?: string, foto?: string): FilaTarifa {
    return {
      id,
      nombre: this.nombreBase(nombre),
      variante: this.variante(nombre),
      descripcion,
      precio: this.formatearPrecio(costo),
      duracion,
      foto
    };
  }

  // La foto del tratamiento, si el servicio trae una que sirva. El catálogo
  // arrastra logotipos y banners corporativos cargados por error en el campo
  // de imagen; esos no son fotos del tratamiento y no entran.
  private fotoDe(servicio: Servicio): string | undefined {
    const url = servicio.foto?.url || servicio.fotos?.[0]?.url;
    if (!url) return undefined;

    const u = url.toLowerCase();
    if (u.includes('canaco') || u.includes('logo') || u.includes('banner')) return undefined;

    return url;
  }

  /* ------------------------------------------------------------------
     El índice marca la categoría en pantalla.

     Se resuelve con IntersectionObserver y no con un listener de scroll:
     el observador lo alimenta el compositor, así que sigue funcionando
     aunque el documento no emita eventos de scroll — que es justo lo que
     pasa aquí — y no cuesta trabajo en el hilo principal al desplazarse.

     El rootMargin recorta el viewport a una banda estrecha a un tercio de
     la altura: la línea de lectura. La categoría que cruza esa banda es la
     que se está leyendo. Entre categoría y categoría no hay ninguna en la
     banda, y entonces la marca simplemente se queda donde estaba.
     ------------------------------------------------------------------ */
  private observarCategorias(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.observador?.disconnect();

    this.zone.runOutsideAngular(() => {
      this.observador = new IntersectionObserver(entradas => {
        // La banda es más angosta que cualquier categoría, así que en la
        // práctica sólo entra una; si alguna vez entran dos, gana la de
        // arriba, que es la que se está leyendo.
        const dentro = entradas
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const ancla = dentro[0]?.target.id;
        if (ancla && ancla !== this.anclaActiva) {
          this.zone.run(() => (this.anclaActiva = ancla));
        }
      }, { rootMargin: '-30% 0px -68% 0px', threshold: 0 });

      for (const bloque of this.tarifario) {
        const el = document.getElementById(bloque.ancla);
        if (el) this.observador!.observe(el);
      }
    });
  }

  irACategoria(ancla: string): void {
    this.anclaActiva = ancla;
    document.getElementById(ancla)?.scrollIntoView({ block: 'start' });
  }

  // Orden alfabético local. Mantiene juntas las variantes de un mismo
  // tratamiento ("… Corta Duración" / "… Larga Duración"), que es la
  // comparación real que hace el paciente.
  private ordenarPorNombre(lista: Servicio[]): Servicio[] {
    return lista.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base', numeric: true })
    );
  }

  // Separa el nombre base de su variante entre paréntesis, para poder
  // jerarquizarlos tipográficamente en vez de repetir el nombre completo.
  nombreBase(nombre: string): string {
    return nombre.replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  variante(nombre: string): string | null {
    const m = nombre.match(/\(([^)]*)\)\s*$/);
    return m ? m[1].trim() : null;
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

  trackByBloque(index: number, bloque: BloqueTarifa): string {
    return bloque.ancla;
  }

  trackByFila(index: number, fila: FilaTarifa): string {
    return fila.id;
  }
}
