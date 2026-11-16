import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, Subscription, debounceTime, of, switchMap, catchError, map } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';
import { SwalService } from '../../services/swal/swal.service';
import {
  AreaCotizacion, CalculoCotizacion, Cotizacion, CotizacionesService, DatosCotizacion, Descuento,
  MetodoAceptar, OpcionCatalogo, PagoCotizacion, RenglonCotizacion, dinero, textoPago
} from '../../services/cotizaciones/cotizaciones.service';

const PESTANAS: { valor: AreaCotizacion; etiqueta: string }[] = [
  { valor: 'Estetica', etiqueta: 'Estético' },
  { valor: 'Dental', etiqueta: 'Dental' },
  { valor: 'Plan', etiqueta: 'Planes' }
];
const AREAS: Record<AreaCotizacion, string> = { Estetica: 'Estético', Dental: 'Dental', Plan: 'Plan' };
const sinDescuento = (): Descuento => ({ tipo: 'Ninguno', valor: 0 });
const normalizar = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

@Component({
  selector: 'app-cotizador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cotizador.component.html',
  styleUrl: './cotizador.component.css'
})
export class CotizadorComponent implements OnInit, OnDestroy {
  readonly pestanas = PESTANAS;
  readonly areas = AREAS;
  readonly textoPago = textoPago;

  // Paciente
  paciente: any = null;
  private pacientes: any[] = [];
  busquedaPaciente = '';

  // Catálogo
  pestana: AreaCotizacion = 'Estetica';
  busqueda = '';
  private catalogo: OpcionCatalogo[] = [];
  cargandoCatalogo = true;

  // Formulario
  items: RenglonCotizacion[] = [];
  descuentoEstetica = sinDescuento();
  descuentoDental = sinDescuento();
  descuentoGeneral = sinDescuento();
  pago: PagoCotizacion = { modalidad: 'Contado', enganche: 0, frecuencia: 'mensual', parcialidades: 3 };
  vigenciaDias = 15;
  notas = '';

  calculo: CalculoCotizacion | null = null;
  errorCalculo = '';
  calculando = false;

  cotizacion: Cotizacion | null = null;
  // Hay cambios sin guardar: PDF, WhatsApp y aceptar guardan antes
  sucio = false;
  guardando = false;

  private recalcular$ = new Subject<void>();
  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private http: HttpClient,
    private cotizacionesService: CotizacionesService,
    private swal: SwalService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogo();
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

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cotizacionesService.obtener(id).subscribe({
        next: (c) => this.cargarCotizacion(c),
        error: () => { this.swal.error('No se encontró la cotización.'); this.router.navigate(['/admin/cotizador']); }
      });
      return;
    }
    const pacienteId = this.route.snapshot.queryParamMap.get('paciente');
    this.cargarPacientes(pacienteId);
    this.tomarBorrador();
  }

  // Lo que se armó en el cotizador rápido (botón flotante) se sigue aquí
  private tomarBorrador(): void {
    const b = this.cotizacionesService.borrador;
    if (!b?.items?.length) return;
    this.cotizacionesService.borrador = null;
    this.items = b.items.map(i => ({ ...i, descuento: { ...i.descuento } }));
    if (b.descuentoEstetica) this.descuentoEstetica = { ...b.descuentoEstetica };
    if (b.descuentoDental) this.descuentoDental = { ...b.descuentoDental };
    if (b.descuentoGeneral) this.descuentoGeneral = { ...b.descuentoGeneral };
    if (b.pago) this.pago = { ...this.pago, ...b.pago };
    this.cambio();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get soloLectura(): boolean {
    return !!this.cotizacion && this.cotizacion.estado !== 'Pendiente';
  }

  // ===== Paciente =====

  private cargarPacientes(preseleccion: string | null): void {
    this.http.get<any[]>(`${environment.apiUrl}/pacientes`).subscribe({
      next: (lista) => {
        this.pacientes = lista || [];
        if (preseleccion) this.paciente = this.pacientes.find(p => p._id === preseleccion) || null;
      },
      error: () => this.pacientes = []
    });
  }

  get resultadosPaciente(): any[] {
    const q = normalizar(this.busquedaPaciente.trim());
    if (q.length < 2) return [];
    const digitos = q.replace(/\D/g, '');
    return this.pacientes.filter(p => {
      const nombre = normalizar(`${p.nombre} ${p.apeP} ${p.apeM || ''}`);
      const tel = `${p.telefonoWhatsapp || ''} ${p.telefonoPaciente || ''}`;
      return q.split(/\s+/).every(parte => nombre.includes(parte)) || (digitos.length >= 3 && tel.includes(digitos));
    }).slice(0, 8);
  }

  elegirPaciente(p: any): void {
    this.paciente = p;
    this.busquedaPaciente = '';
    this.cambio();
  }

  cambiarPaciente(): void {
    this.paciente = null;
    if (this.pacientes.length === 0) this.cargarPacientes(null);
  }

  nombrePaciente(p: any = this.paciente): string {
    return p ? `${p.nombre} ${p.apeP} ${p.apeM || ''}`.trim() : '';
  }

  // ===== Catálogo =====

  private cargarCatalogo(): void {
    this.cotizacionesService.catalogo().subscribe(opciones => {
      this.catalogo = opciones;
      this.cargandoCatalogo = false;
    });
  }

  get opciones(): OpcionCatalogo[] {
    const q = normalizar(this.busqueda.trim());
    return this.catalogo.filter(o => o.area === this.pestana && (!q || normalizar(o.nombre).includes(q)));
  }

  contarEnPestana(area: AreaCotizacion): number {
    return this.items.filter(i => i.area === area).length;
  }

  agregar(o: OpcionCatalogo): void {
    // Un tratamiento repetido suma sesiones en vez de otro renglón
    const existente = this.items.find(i => i.refId === o.refId && i.area === o.area);
    if (existente) existente.sesiones = Math.min(100, existente.sesiones + 1);
    else this.items.push({ tipo: o.tipo, area: o.area, refId: o.refId, nombre: o.nombre, sesiones: 1, descuento: sinDescuento(), usarPromo: true });
    this.cambio();
  }

  quitar(i: number): void {
    this.items.splice(i, 1);
    this.cambio();
  }

  // Precio y promo calculados por el backend para el renglón i
  calculado(i: number): RenglonCotizacion | null {
    return this.calculo?.items[i] || null;
  }

  // ===== Cálculo =====

  private datos(): DatosCotizacion | null {
    if (this.items.length === 0) return null;
    return {
      pacienteId: this.paciente?._id,
      items: this.items.map(i => ({
        _id: i._id, tipo: i.tipo, area: i.area, refId: i.refId, sesiones: Number(i.sesiones) || 1,
        descuento: { tipo: i.descuento.tipo, valor: Number(i.descuento.valor) || 0 }, usarPromo: i.usarPromo !== false
      })),
      descuentoEstetica: this.descuentoEstetica,
      descuentoDental: this.descuentoDental,
      descuentoGeneral: this.descuentoGeneral,
      pago: this.pago.modalidad === 'Plazos'
        ? { modalidad: 'Plazos', enganche: Number(this.pago.enganche) || 0, frecuencia: this.pago.frecuencia, parcialidades: Number(this.pago.parcialidades) || 0 }
        : { modalidad: 'Contado' },
      vigenciaDias: Number(this.vigenciaDias) || 15,
      notas: this.notas
    };
  }

  cambio(): void {
    if (this.soloLectura) return;
    this.sucio = true;
    this.recalcular$.next();
  }

  get hayEstetica(): boolean { return this.items.some(i => i.area === 'Estetica'); }
  get hayDental(): boolean { return this.items.some(i => i.area === 'Dental'); }

  // ===== Guardar y acciones =====

  private cargarCotizacion(c: Cotizacion): void {
    this.cotizacion = c;
    // Al guardar el backend regresa sólo el id del paciente; el que ya está elegido sirve
    if (c.pacienteId && typeof c.pacienteId === 'object') this.paciente = c.pacienteId;
    this.items = c.items.map(i => ({ ...i, descuento: { ...i.descuento }, usarPromo: i.usarPromo !== false }));
    this.descuentoEstetica = { ...c.descuentoEstetica };
    this.descuentoDental = { ...c.descuentoDental };
    this.descuentoGeneral = { ...c.descuentoGeneral };
    this.pago = { enganche: 0, frecuencia: 'mensual', parcialidades: 3, ...c.pago };
    this.notas = c.notas || '';
    this.calculo = c as any;
    this.sucio = false;
  }

  private guardar$() {
    const datos = this.datos();
    if (!this.paciente) throw new Error('Elige al paciente de la cotización.');
    if (!datos) throw new Error('Agrega al menos un tratamiento.');
    return this.cotizacion ? this.cotizacionesService.actualizar(this.cotizacion._id, datos) : this.cotizacionesService.crear(datos);
  }

  // Guarda si hace falta y sigue con `despues`
  private conGuardado(despues: (c: Cotizacion) => void): void {
    if (this.cotizacion && (!this.sucio || this.soloLectura)) { despues(this.cotizacion); return; }
    let peticion;
    try { peticion = this.guardar$(); } catch (e: any) { this.swal.warning(e.message); return; }
    this.guardando = true;
    peticion.subscribe({
      next: (c) => {
        this.guardando = false;
        const nueva = !this.cotizacion;
        this.cargarCotizacion(c);
        // Sólo la URL: navegar recrearía la página a media acción
        if (nueva) this.location.replaceState(`/admin/cotizador/${c._id}`);
        despues(c);
      },
      error: (err) => { this.guardando = false; this.swal.error(err?.error?.message || 'No se pudo guardar la cotización.'); }
    });
  }

  guardar(): void {
    this.conGuardado(c => this.swal.toast(`Cotización #${c.folio} guardada`, '', 'success'));
  }

  descargarPdf(): void {
    this.conGuardado(c => this.cotizacionesService.pdf(c._id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cotizacion-${c.folio}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.swal.error('No se pudo generar el PDF.')
    }));
  }

  enviarWhatsApp(): void {
    this.conGuardado(c => {
      const digitos = String(this.paciente?.telefonoWhatsapp || this.paciente?.telefonoPaciente || '').replace(/\D/g, '');
      const telefono = digitos.length === 10 ? `52${digitos}` : digitos;
      window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(this.textoWhatsApp(c))}`, '_blank');
    });
  }

  private textoWhatsApp(c: Cotizacion): string {
    const t = c.totales;
    const descuentos = t.promociones + t.descuentosRenglon + t.descuentoEstetica + t.descuentoDental + t.descuentoGeneral;
    const vigencia = new Date(c.vigenciaHasta).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
    return [
      `Hola ${this.paciente?.nombre || ''}, te compartimos tu cotización #${c.folio}:`,
      '',
      ...c.items.map(i => `• ${i.nombre}${i.sesiones > 1 ? ` (${i.sesiones} ${i.tipo === 'Plan' ? 'pzas' : 'sesiones'})` : ''}: ${dinero(i.importe || 0)}`),
      '',
      ...(descuentos > 0 ? [`Ahorro: ${dinero(descuentos)}`] : []),
      `*Total: ${dinero(t.total)}*`,
      textoPago(c.pago),
      '',
      `Precios válidos hasta el ${vigencia}.`
    ].join('\n');
  }

  async aceptar(): Promise<void> {
    const plazos = this.pago.modalidad === 'Plazos';
    const opciones: Record<string, string> = { Efectivo: 'Efectivo', Tarjeta: 'Tarjeta', Transferencia: 'Transferencia' };
    if (plazos) opciones['Link'] = 'Mandarle link de pago (Stripe)';
    const r = await Swal.fire({
      title: 'Aceptar y crear el plan',
      text: plazos
        ? '¿Cómo paga el enganche? El resto se cobra como una membresía (Caja → Membresías contratadas).'
        : 'De contado se cobra completo ahora. ¿Cómo paga?',
      input: 'select',
      inputOptions: opciones,
      inputPlaceholder: 'Elige…',
      showCancelButton: true,
      confirmButtonText: 'Aceptar plan',
      cancelButtonText: 'Cancelar',
      inputValidator: (v) => v ? null : 'Elige cómo paga'
    });
    if (!r.isConfirmed) return;
    this.conGuardado(c => this.cotizacionesService.aceptar(c._id, r.value as MetodoAceptar).subscribe({
      next: (aceptada) => {
        this.cargarCotizacion(aceptada);
        this.swal.success(r.value === 'Link'
          ? 'El plan quedó creado. Manda el link del enganche desde Caja → Membresías contratadas.'
          : 'El plan quedó creado y el pago registrado en el corte del día.', `Plan #${aceptada.folio}`);
      },
      error: (err) => this.swal.error(err?.error?.message || 'No se pudo aceptar la cotización.')
    }));
  }

  async rechazar(): Promise<void> {
    if (!this.cotizacion) return;
    const r = await Swal.fire({
      title: 'Rechazar cotización',
      input: 'text',
      inputLabel: 'Motivo (opcional)',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Volver'
    });
    if (!r.isConfirmed) return;
    this.cotizacionesService.rechazar(this.cotizacion._id, r.value || '').subscribe({
      next: (c) => this.cargarCotizacion(c),
      error: (err) => this.swal.error(err?.error?.message || 'No se pudo rechazar.')
    });
  }

  // Otra cotización para el mismo paciente, desde cero
  nueva(): void {
    this.cotizacion = null;
    this.items = [];
    this.descuentoEstetica = sinDescuento();
    this.descuentoDental = sinDescuento();
    this.descuentoGeneral = sinDescuento();
    this.pago = { modalidad: 'Contado', enganche: 0, frecuencia: 'mensual', parcialidades: 3 };
    this.vigenciaDias = 15;
    this.notas = '';
    this.calculo = null;
    this.errorCalculo = '';
    this.sucio = false;
    this.location.replaceState('/admin/cotizador', this.paciente?._id ? `paciente=${this.paciente._id}` : '');
  }
}
