import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ETIQUETAS_DESCUENTO,
  ItemPromocion,
  Promocion,
  PromocionesService,
  TipoDescuento,
  TipoItem,
  precioConDescuento
} from '../../services/promociones/promociones.service';
import { CategoriasService } from '../../services/categorias/categorias.service';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { SwalService } from '../../services/swal/swal.service';

type EstadoPromo = 'activa' | 'proxima' | 'terminada' | 'pausada';

// Formulario en edición: igual que Promocion, pero con los ids sueltos (no poblados)
interface Borrador {
  _id?: string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  items: ItemPromocion[];
  usarCupo: boolean;
  cupoTotal: number | null;
  unaVezPorPaciente: boolean;
  fotos: { url: string; key: string }[];
}

@Component({
  selector: 'app-gestion-promociones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-promociones.component.html',
  styleUrl: './gestion-promociones.component.css'
})
export class GestionPromocionesComponent implements OnInit, OnDestroy {
  promociones: (Promocion & { estado?: EstadoPromo; tiempoRestanteStr?: string })[] = [];
  categorias: any[] = [];
  servicios: any[] = [];

  readonly etiquetasDescuento = ETIQUETAS_DESCUENTO;
  readonly tiposDescuento = Object.keys(ETIQUETAS_DESCUENTO) as TipoDescuento[];

  // null = listado; un objeto = editor abierto (nuevo o existente)
  borrador: Borrador | null = null;
  fotosNuevas: { file: File; preview: string }[] = [];
  fotosEliminar: string[] = [];

  cargando = false;
  guardando = false;
  timerInterval: any = null;

  constructor(
    private promosService: PromocionesService,
    private categoriasService: CategoriasService,
    private serviciosService: ServiciosService,
    private swal: SwalService
  ) {}

  ngOnInit(): void {
    this.cargarPromociones();
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => this.categorias = data,
      error: (err) => console.error(err)
    });
    this.serviciosService.obtenerServicios().subscribe({
      next: (data) => this.servicios = (Array.isArray(data) ? data : (data.servicios || []))
        .filter((s: any) => s.activo !== false),
      error: (err) => console.error(err)
    });
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  cargarPromociones(): void {
    this.cargando = true;
    this.promosService.obtenerPromociones().subscribe({
      next: (data) => {
        this.promociones = data;
        this.cargando = false;
        this.iniciarContadores();
      },
      error: () => {
        this.swal.error('Error al cargar promociones');
        this.cargando = false;
      }
    });
  }

  // ---------- Catálogo ----------

  servicioPorId(id: any): any {
    const clave = id?._id || id;
    return this.servicios.find(s => s._id === clave);
  }

  serviciosDeCategoria(categoriaId: any): number {
    const clave = categoriaId?._id || categoriaId;
    return this.servicios.filter(s => (s.categoria?._id || s.categoria) === clave).length;
  }

  // ---------- Editor ----------

  nuevaPromocion(): void {
    this.abrirEditor({
      nombre: '',
      descripcion: '',
      fechaInicio: '',
      fechaFin: '',
      activo: true,
      items: [],
      usarCupo: false,
      cupoTotal: null,
      unaVezPorPaciente: false,
      fotos: []
    });
  }

  editarPromocion(p: Promocion): void {
    const id = (x: any) => x?._id || x || '';
    this.abrirEditor({
      _id: p._id,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      fechaInicio: this.aFechaInput(p.fechaInicio),
      fechaFin: this.aFechaInput(p.fechaFin),
      activo: p.activo,
      items: (p.items || []).map(item => ({
        ...item,
        servicioId: id(item.servicioId),
        categoriaId: id(item.categoriaId),
        servicios: (item.servicios || []).map(s => ({ servicioId: id(s.servicioId), cantidad: s.cantidad }))
      })),
      usarCupo: !!p.limites?.cupoTotal,
      cupoTotal: p.limites?.cupoTotal || null,
      unaVezPorPaciente: !!p.limites?.unaVezPorPaciente,
      fotos: [...(p.fotos || [])]
    });
  }

  private abrirEditor(borrador: Borrador): void {
    this.borrador = borrador;
    this.fotosNuevas = [];
    this.fotosEliminar = [];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion(): void {
    this.borrador = null;
    this.fotosNuevas = [];
    this.fotosEliminar = [];
  }

  // La fecha se guarda en hora de México; el input date necesita "YYYY-MM-DD" local
  private aFechaInput(fecha: string): string {
    const d = new Date(fecha);
    const local = new Date(d.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');
    return `${local.getFullYear()}-${mm}-${dd}`;
  }

  agregarItem(tipo: TipoItem): void {
    if (!this.borrador) return;
    if (tipo === 'Paquete') {
      this.borrador.items.push({
        tipo, nombre: '', formato: 'Combo', modalidad: 'Visita',
        servicios: [{ servicioId: '', cantidad: 1 }], precio: null, lleva: 2, paga: 1
      });
    } else {
      this.borrador.items.push({
        tipo, servicioId: '', categoriaId: '', tipoDescuento: 'Porcentaje', valor: null
      });
    }
  }

  quitarItem(i: number): void {
    this.borrador?.items.splice(i, 1);
  }

  agregarServicioPaquete(item: ItemPromocion): void {
    item.servicios = [...(item.servicios || []), { servicioId: '', cantidad: 1 }];
  }

  quitarServicioPaquete(item: ItemPromocion, i: number): void {
    item.servicios?.splice(i, 1);
  }

  // Un NxM es de un solo servicio: al cambiar a NxM se deja sólo el primero
  cambiarFormato(item: ItemPromocion): void {
    if (item.formato === 'NxM') {
      item.servicios = [(item.servicios || [])[0] || { servicioId: '', cantidad: 1 }];
      item.lleva = item.lleva || 2;
      item.paga = item.paga || 1;
    }
  }

  // ---------- Vista previa de precios ----------

  precioFinalServicio(item: ItemPromocion): number | null {
    const s = this.servicioPorId(item.servicioId);
    if (!s || !item.valor) return null;
    return precioConDescuento(s.costo, item.tipoDescuento, item.valor);
  }

  precioListaPaquete(item: ItemPromocion): number {
    if (item.formato === 'NxM') {
      const s = this.servicioPorId(item.servicios?.[0]?.servicioId);
      return s ? s.costo * (Number(item.lleva) || 0) : 0;
    }
    return (item.servicios || []).reduce((total, linea) => {
      const s = this.servicioPorId(linea.servicioId);
      return total + (s ? s.costo * (Number(linea.cantidad) || 1) : 0);
    }, 0);
  }

  precioFinalPaquete(item: ItemPromocion): number {
    if (item.formato === 'NxM') {
      const s = this.servicioPorId(item.servicios?.[0]?.servicioId);
      return s ? s.costo * (Number(item.paga) || 0) : 0;
    }
    return Number(item.precio) || 0;
  }

  // Resumen de un renglón ya guardado (con ids poblados) para el listado
  resumenItem(item: ItemPromocion): string {
    const pesos = (n?: number | null) => `$${Number(n || 0).toLocaleString('es-MX')}`;
    const desc = (tipo?: TipoDescuento, valor?: number | null) =>
      tipo === 'Porcentaje' ? `${valor}% menos`
        : tipo === 'MontoDescontado' ? `${pesos(valor)} menos`
          : `a ${pesos(valor)}`;
    if (item.tipo === 'Servicio') return `${item.servicioId?.nombre || 'Servicio'} · ${desc(item.tipoDescuento, item.valor)}`;
    if (item.tipo === 'Categoria') return `Todo ${item.categoriaId?.nombre || 'categoría'} · ${desc(item.tipoDescuento, item.valor)}`;
    const formato = item.formato === 'NxM' ? `${item.lleva}x${item.paga}` : pesos(item.precio);
    return `${item.nombre} · ${formato}${item.modalidad === 'Sesiones' ? ' · sesiones' : ''}`;
  }

  // ---------- Fotos ----------

  onFotoSelected(event: any): void {
    const files: FileList = event.target.files;
    for (const file of Array.from(files || [])) {
      const reader = new FileReader();
      reader.onload = () => this.fotosNuevas.push({ file, preview: reader.result as string });
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  }

  quitarFotoNueva(i: number): void {
    this.fotosNuevas.splice(i, 1);
  }

  quitarFotoGuardada(key: string): void {
    if (!this.borrador) return;
    this.fotosEliminar.push(key);
    this.borrador.fotos = this.borrador.fotos.filter(f => f.key !== key);
  }

  // ---------- Guardar ----------

  // Validación rápida antes de ir al servidor; el backend repite todas las reglas
  private errorDeBorrador(b: Borrador): string | null {
    if (!b.nombre.trim()) return 'Ponle nombre a la promoción.';
    if (!b.fechaInicio || !b.fechaFin) return 'Elige fecha de inicio y de fin.';
    if (b.fechaFin < b.fechaInicio) return 'La fecha de fin es anterior a la de inicio.';
    if (b.items.length === 0) return 'Agrega al menos un servicio, categoría o paquete.';
    for (const [i, item] of b.items.entries()) {
      const r = `Renglón ${i + 1}`;
      if (item.tipo === 'Servicio' && !item.servicioId) return `${r}: elige el servicio.`;
      if (item.tipo === 'Categoria' && !item.categoriaId) return `${r}: elige la categoría.`;
      if (item.tipo !== 'Paquete' && !(Number(item.valor) > 0)) return `${r}: captura el valor del descuento.`;
      if (item.tipo === 'Paquete') {
        if (!item.nombre?.trim()) return `${r}: ponle nombre al paquete.`;
        if ((item.servicios || []).some(s => !s.servicioId)) return `${r}: elige todos los servicios del paquete.`;
        if (item.formato === 'Combo' && !(Number(item.precio) > 0)) return `${r}: captura el precio del paquete.`;
      }
    }
    if (b.usarCupo && !(Number(b.cupoTotal) >= 1)) return 'El cupo debe ser de al menos 1.';
    return null;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async guardar(): Promise<void> {
    const b = this.borrador;
    if (!b || this.guardando) return;

    const error = this.errorDeBorrador(b);
    if (error) {
      this.swal.warning(error);
      return;
    }

    this.guardando = true;
    let fotosBase64: any[] = [];
    try {
      fotosBase64 = await Promise.all(this.fotosNuevas.map(async ({ file }) => ({
        name: file.name, type: file.type, data: await this.fileToBase64(file)
      })));
    } catch {
      this.guardando = false;
      this.swal.error('No se pudieron leer las fotos seleccionadas');
      return;
    }

    const payload = {
      nombre: b.nombre,
      descripcion: b.descripcion,
      fechaInicio: b.fechaInicio,
      fechaFin: b.fechaFin,
      activo: b.activo,
      items: b.items,
      limites: { cupoTotal: b.usarCupo ? b.cupoTotal : null, unaVezPorPaciente: b.unaVezPorPaciente },
      fotosBase64,
      fotosEliminar: this.fotosEliminar
    };

    const peticion = b._id
      ? this.promosService.actualizarPromocion(b._id, payload)
      : this.promosService.crearPromocion(payload);

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.swal.toast(b._id ? 'Promoción actualizada' : 'Promoción creada', '', 'success');
        this.cancelarEdicion();
        this.cargarPromociones();
      },
      error: (err) => {
        this.guardando = false;
        this.swal.error(err?.error?.message || 'No se pudo guardar la promoción');
      }
    });
  }

  cambiarEstado(p: Promocion): void {
    this.promosService.cambiarEstado(p._id!, !p.activo).subscribe({
      next: (res) => {
        p.activo = res.activo;
        this.actualizarEstados();
        this.swal.toast(res.activo ? 'Promoción reactivada' : 'Promoción pausada', '', 'success');
      },
      error: () => this.swal.error('No se pudo cambiar el estado')
    });
  }

  eliminarPromocion(p: Promocion): void {
    const aviso = p.usos
      ? `"${p.nombre}" ya se usó en ${p.usos} cita(s). Las citas conservan su descuento, pero dejarás de ver a qué promoción pertenecen. ¿Eliminarla de todos modos?`
      : `¿Eliminar "${p.nombre}"?`;
    this.swal.confirm(aviso).then((result: any) => {
      if (!result.isConfirmed) return;
      this.promosService.eliminarPromocion(p._id!).subscribe({
        next: () => {
          this.swal.toast('Promoción eliminada', '', 'success');
          this.cargarPromociones();
        },
        error: () => this.swal.error('Error al eliminar la promoción')
      });
    });
  }

  // ---------- Estado y cuenta regresiva ----------

  private iniciarContadores(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.actualizarEstados();
    this.timerInterval = setInterval(() => this.actualizarEstados(), 1000);
  }

  private actualizarEstados(): void {
    const ahora = Date.now();
    for (const p of this.promociones) {
      const inicio = new Date(p.fechaInicio).getTime();
      const fin = new Date(p.fechaFin).getTime();
      if (ahora > fin) {
        p.estado = 'terminada';
        p.tiempoRestanteStr = 'Terminó';
      } else if (!p.activo) {
        p.estado = 'pausada';
        p.tiempoRestanteStr = 'Pausada';
      } else if (ahora < inicio) {
        p.estado = 'proxima';
        p.tiempoRestanteStr = `Inicia en ${this.formatearDiferencia(inicio - ahora)}`;
      } else {
        p.estado = 'activa';
        p.tiempoRestanteStr = `Termina en ${this.formatearDiferencia(fin - ahora)}`;
      }
    }
  }

  private formatearDiferencia(ms: number): string {
    const dias = Math.floor(ms / 86400000);
    const horas = Math.floor((ms % 86400000) / 3600000);
    const minutos = Math.floor((ms % 3600000) / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const partes = [];
    if (dias > 0) partes.push(`${dias}d`);
    partes.push(`${String(horas).padStart(2, '0')}h`, `${String(minutos).padStart(2, '0')}m`, `${String(segundos).padStart(2, '0')}s`);
    return partes.join(' ');
  }

  trackByIndex(i: number): number {
    return i;
  }
}
