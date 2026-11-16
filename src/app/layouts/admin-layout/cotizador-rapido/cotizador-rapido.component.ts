import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, Subscription, catchError, debounceTime, filter, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../services/auth/auth.service';
import { tiene } from '../../../services/auth/permisos';
import { SwalService } from '../../../services/swal/swal.service';
import {
  AreaCotizacion, CalculoCotizacion, CotizacionesService, DatosCotizacion, Descuento, OpcionCatalogo,
  PagoCotizacion, PagoProgramado, RenglonCotizacion, calendarioPagos, dinero, textoPago
} from '../../../services/cotizaciones/cotizaciones.service';

const AREAS: Record<AreaCotizacion, string> = { Estetica: 'Estético', Dental: 'Dental', Plan: 'Plan' };
const sinDescuento = (): Descuento => ({ tipo: 'Ninguno', valor: 0 });
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Botón flotante en todo el panel: cuánto saldría un tratamiento y cómo quedaría
// a plazos, sin elegir paciente. Lo armado se puede pasar al cotizador completo.
@Component({
  selector: 'app-cotizador-rapido',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cotizador-rapido.component.html',
  styleUrl: './cotizador-rapido.component.css'
})
export class CotizadorRapidoComponent implements OnInit, OnDestroy {
  @ViewChild('buscador') buscador?: ElementRef<HTMLInputElement>;
  @ViewChild('boton') boton?: ElementRef<HTMLButtonElement>;

  readonly areas = AREAS;
  readonly enganches = [10, 20, 30, 50];
  readonly plazos = [3, 6, 9, 12];

  permitido = false;
  // En el cotizador completo sobra; en Chats sube para no tapar el botón de enviar
  enCotizador = false;
  enChats = false;
  abierto = false;

  busqueda = '';
  private catalogo: OpcionCatalogo[] = [];
  private catalogoPedido = false;
  cargandoCatalogo = false;

  items: RenglonCotizacion[] = [];
  descuentoGeneral = sinDescuento();
  pago: PagoCotizacion = { modalidad: 'Contado', enganche: 0, frecuencia: 'mensual', parcialidades: 6 };

  calculo: CalculoCotizacion | null = null;
  errorCalculo = '';
  calculando = false;

  private recalcular$ = new Subject<void>();
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    private cotizacionesService: CotizacionesService,
    private swal: SwalService
  ) {}

  ngOnInit(): void {
    this.permitido = tiene(this.auth.getUsuario()?.tipo, 'cotizar');
    if (!this.permitido) return;

    this.marcarRuta(this.router.url);
    this.subs.push(this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.marcarRuta((e as NavigationEnd).urlAfterRedirects);
      if (this.enCotizador) this.abierto = false;
    }));

    this.subs.push(this.recalcular$.pipe(
      debounceTime(300),
      switchMap(() => {
        const datos = this.datos();
        if (!datos) return of(null);
        this.calculando = true;
        return this.cotizacionesService.calcular(datos).pipe(
          map(calculo => ({ calculo, error: '' })),
          catchError(err => of({ calculo: null, error: err?.error?.message || 'No se pudo calcular.' }))
        );
      })
    ).subscribe(r => {
      this.calculando = false;
      if (!r) { this.calculo = null; this.errorCalculo = ''; return; }
      this.errorCalculo = r.error;
      if (r.calculo) this.calculo = r.calculo;
    }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private marcarRuta(url: string): void {
    this.enCotizador = url.startsWith('/admin/cotizador');
    this.enChats = url.startsWith('/admin/chats');
  }

  // ===== Abrir y cerrar =====

  abrir(): void {
    this.abierto = true;
    if (!this.catalogoPedido) {
      this.catalogoPedido = true;
      this.cargandoCatalogo = true;
      this.cotizacionesService.catalogo().subscribe(opciones => {
        this.catalogo = opciones;
        this.cargandoCatalogo = false;
      });
    }
    setTimeout(() => this.buscador?.nativeElement.focus());
  }

  cerrar(): void {
    this.abierto = false;
    setTimeout(() => this.boton?.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    if (this.abierto) this.cerrar();
  }

  // ===== Tratamientos =====

  get resultados(): OpcionCatalogo[] {
    const q = normalizar(this.busqueda.trim());
    if (!q) return [];
    return this.catalogo.filter(o => normalizar(o.nombre).includes(q)).slice(0, 8);
  }

  agregar(o: OpcionCatalogo): void {
    const existente = this.items.find(i => i.refId === o.refId && i.area === o.area);
    if (existente) existente.sesiones = Math.min(100, existente.sesiones + 1);
    else this.items.push({ tipo: o.tipo, area: o.area, refId: o.refId, nombre: o.nombre, sesiones: 1, descuento: sinDescuento(), usarPromo: true });
    this.busqueda = '';
    this.cambio();
    setTimeout(() => this.buscador?.nativeElement.focus());
  }

  sumarSesion(it: RenglonCotizacion, delta: number): void {
    it.sesiones = Math.max(1, Math.min(100, (Number(it.sesiones) || 1) + delta));
    this.cambio();
  }

  quitar(i: number): void {
    this.items.splice(i, 1);
    this.cambio();
  }

  calculado(i: number): RenglonCotizacion | null {
    return this.calculo?.items[i] || null;
  }

  limpiar(): void {
    this.items = [];
    this.descuentoGeneral = sinDescuento();
    this.pago = { modalidad: 'Contado', enganche: 0, frecuencia: 'mensual', parcialidades: 6 };
    this.cambio();
  }

  // ===== Plan de pagos =====

  get total(): number {
    return this.calculo?.totales.total || 0;
  }

  get ahorro(): number {
    const t = this.calculo?.totales;
    return t ? Math.round((t.lista - t.total) * 100) / 100 : 0;
  }

  cambiarModalidad(modalidad: 'Contado' | 'Plazos'): void {
    this.pago.modalidad = modalidad;
    // Un enganche de arranque para que el plan se vea de inmediato
    if (modalidad === 'Plazos' && !Number(this.pago.enganche) && this.total > 0) this.pago.enganche = this.redondearPesos(this.total * 0.2);
    this.cambio();
  }

  engancheEn(porcentaje: number): void {
    this.pago.enganche = this.redondearPesos(this.total * porcentaje / 100);
    this.cambio();
  }

  porcentajeEnganche(): number {
    return this.total > 0 ? Math.round((Number(this.pago.enganche) || 0) / this.total * 100) : 0;
  }

  private redondearPesos(monto: number): number {
    return Math.round(monto);
  }

  get calendario(): PagoProgramado[] {
    return this.calculo && !this.errorCalculo ? calendarioPagos(this.calculo.pago, this.total) : [];
  }

  // ===== Cálculo =====

  private datos(): DatosCotizacion | null {
    if (this.items.length === 0) return null;
    return {
      pacienteId: '',
      items: this.items.map(i => ({
        tipo: i.tipo, area: i.area, refId: i.refId, sesiones: Number(i.sesiones) || 1,
        descuento: { tipo: i.descuento.tipo, valor: Number(i.descuento.valor) || 0 }, usarPromo: i.usarPromo !== false
      })),
      descuentoEstetica: sinDescuento(),
      descuentoDental: sinDescuento(),
      descuentoGeneral: this.descuentoGeneral,
      pago: this.pago.modalidad === 'Plazos'
        ? { modalidad: 'Plazos', enganche: Number(this.pago.enganche) || 0, frecuencia: this.pago.frecuencia, parcialidades: Number(this.pago.parcialidades) || 0 }
        : { modalidad: 'Contado' },
      vigenciaDias: 15,
      notas: ''
    };
  }

  cambio(): void {
    this.recalcular$.next();
  }

  // ===== Acciones =====

  async copiar(): Promise<void> {
    if (!this.calculo) return;
    const fecha = (f: Date) => f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const texto = [
      'Cotización estimada:',
      ...this.calculo.items.map(i => `• ${i.nombre}${i.sesiones > 1 ? ` (${i.sesiones} sesiones)` : ''}: ${dinero(i.importe || 0)}`),
      ...(this.ahorro > 0 ? [`Ahorro: ${dinero(this.ahorro)}`] : []),
      `*Total: ${dinero(this.total)}*`,
      textoPago(this.calculo.pago),
      ...(this.calculo.pago.modalidad === 'Plazos' ? this.calendario.map(p => `  ${fecha(p.fecha)} · ${p.etiqueta}: ${dinero(p.monto)}`) : [])
    ].join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      this.swal.toast('Resumen copiado: pégalo en el chat', '', 'success');
    } catch {
      this.swal.error('No se pudo copiar. Revisa los permisos del navegador.');
    }
  }

  // Sigue en el cotizador completo: ahí se elige al paciente, se guarda y se acepta
  crearCotizacion(): void {
    if (this.items.length === 0) return;
    this.cotizacionesService.borrador = {
      items: this.items.map(i => ({ ...i, descuento: { ...i.descuento } })),
      descuentoGeneral: { ...this.descuentoGeneral },
      pago: { ...this.pago }
    };
    this.abierto = false;
    this.router.navigate(['/admin/cotizador']);
    this.limpiar();
  }
}
