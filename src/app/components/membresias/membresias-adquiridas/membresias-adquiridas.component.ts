import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  MembresiasService, Membresia, EstadoMembresia, MetodoPagoMembresia, PagoMembresia, LinkPago,
  ETIQUETAS_ESTADO, calcularCuota
} from '../../../services/membresias/membresias.service';
import { SwalService } from '../../../services/swal/swal.service';
import { environment } from '../../../../environments/environment';

type Filtro = 'vigentes' | 'atrasada' | 'pendiente_pago' | 'liquidada' | 'cancelada' | 'todas';

@Component({
  selector: 'app-membresias-adquiridas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './membresias-adquiridas.component.html',
  styleUrl: './membresias-adquiridas.component.css'
})
export class MembresiasAdquiridasComponent implements OnInit {
  membresiasContratadas: Membresia[] = [];
  loading = true;
  error = '';
  accesoDenegado = false;

  filtro: Filtro = 'vigentes';
  busqueda = '';
  expandida: string | null = null;

  readonly etiquetas = ETIQUETAS_ESTADO;
  readonly metodos: MetodoPagoMembresia[] = ['Efectivo', 'Tarjeta', 'Transferencia'];
  readonly filtros: { valor: Filtro; etiqueta: string }[] = [
    { valor: 'vigentes', etiqueta: 'Vigentes' },
    { valor: 'atrasada', etiqueta: 'Atrasadas' },
    { valor: 'pendiente_pago', etiqueta: 'Pago pendiente' },
    { valor: 'liquidada', etiqueta: 'Liquidadas' },
    { valor: 'cancelada', etiqueta: 'Canceladas' },
    { valor: 'todas', etiqueta: 'Todas' }
  ];

  // Cobro de parcialidad
  cobrando: Membresia | null = null;
  cobro = { monto: 0, metodoPago: 'Efectivo' as MetodoPagoMembresia, nota: '' };
  errorCobro = '';
  guardando = false;

  // Venta en mostrador
  vendiendo = false;
  catalogos: any[] = [];
  pacientes: any[] = [];
  busquedaPaciente = '';
  venta = { pacienteId: '', catalogoId: '', engancheCobrado: false, metodoPago: 'Efectivo' as MetodoPagoMembresia };
  errorVenta = '';

  // Link de pago para que el paciente deje su tarjeta (venta nueva o reenvío)
  linkModal: { membresia: Membresia; link: LinkPago | null; generando: boolean; error: string; copiado: boolean } | null = null;

  constructor(
    private membresiasService: MembresiasService,
    private swal: SwalService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarMembresias();
  }

  cargarMembresias(): void {
    this.loading = true;
    this.accesoDenegado = false;
    this.error = '';
    this.membresiasService.obtenerMembresias().subscribe({
      next: (data) => {
        this.membresiasContratadas = data;
        // Abrir en un filtro vacío esconde lo que sí hay
        if (this.filtro === 'vigentes' && this.contar('vigentes') === 0 && data.length > 0) {
          this.filtro = this.contar('pendiente_pago') > 0 ? 'pendiente_pago' : 'todas';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar membresías adquiridas:', err);
        this.accesoDenegado = err?.status === 401 || err?.status === 403;
        this.error = this.accesoDenegado
          ? 'Tu sesión no tiene permisos para ver este panel. Inicia sesión como administrador.'
          : 'No se pudieron cargar las membresías contratadas.';
        this.loading = false;
      }
    });
  }

  // ===== Listado =====

  private coincideFiltro(m: Membresia, filtro: Filtro): boolean {
    if (filtro === 'todas') return true;
    if (filtro === 'vigentes') return m.estado === 'al_corriente' || m.estado === 'atrasada';
    return m.estado === filtro;
  }

  get visibles(): Membresia[] {
    const q = this.normalizar(this.busqueda);
    return this.membresiasContratadas
      .filter(m => this.coincideFiltro(m, this.filtro))
      .filter(m => !q || this.normalizar(`${this.nombrePaciente(m)} ${this.telefono(m)} ${m.nombreTratamiento}`).includes(q))
      // Lo atrasado primero, y dentro de eso lo más atrasado
      .sort((a, b) => (b.diasAtraso || 0) - (a.diasAtraso || 0));
  }

  get etiquetaFiltro(): string {
    return this.filtros.find(f => f.valor === this.filtro)?.etiqueta || '';
  }

  contar(filtro: Filtro): number {
    return this.membresiasContratadas.filter(m => this.coincideFiltro(m, filtro)).length;
  }

  get saldoPorCobrar(): number {
    return this.membresiasContratadas
      .filter(m => m.estado === 'al_corriente' || m.estado === 'atrasada')
      .reduce((s, m) => s + m.saldo, 0);
  }

  get cobradoEsteMes(): number {
    const hoy = new Date();
    return this.membresiasContratadas.reduce((s, m) => s + m.pagos
      .filter(p => { const f = new Date(p.fecha); return f.getMonth() === hoy.getMonth() && f.getFullYear() === hoy.getFullYear(); })
      .reduce((t, p) => t + p.monto, 0), 0);
  }

  private normalizar(texto: string): string {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  nombrePaciente(m: Membresia): string {
    const p = m.pacienteId;
    return p ? `${p.nombre || ''} ${p.apeP || ''} ${p.apeM || ''}`.trim() : 'Paciente eliminado';
  }

  telefono(m: Membresia): string {
    return String(m.pacienteId?.telefonoWhatsapp || m.pacienteId?.telefonoPaciente || '');
  }

  avance(m: Membresia): number {
    return m.costoTotal > 0 ? Math.min(100, (m.totalPagado / m.costoTotal) * 100) : 0;
  }

  frecuencia(m: Membresia): string {
    return ({ semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' } as Record<string, string>)[m.paymentFrequency] || m.paymentFrequency;
  }

  etiquetaEstado(m: Membresia): string {
    if (m.estado === 'atrasada') return `Atrasada ${m.diasAtraso} ${m.diasAtraso === 1 ? 'día' : 'días'}`;
    return this.etiquetas[m.estado as EstadoMembresia] || m.estado;
  }

  etiquetaPago(p: PagoMembresia): string {
    return p.tipo === 'enganche' ? 'Enganche' : 'Parcialidad';
  }

  toggleHistorial(m: Membresia): void {
    this.expandida = this.expandida === m._id ? null : m._id;
  }

  private reemplazar(actualizada: Membresia): void {
    this.membresiasContratadas = this.membresiasContratadas.map(m => m._id === actualizada._id ? actualizada : m);
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(precio || 0);
  }

  // ===== Cobrar parcialidad =====

  abrirCobro(m: Membresia): void {
    this.cobrando = m;
    this.cobro = { monto: m.proximoPago?.monto || Math.min(m.installmentAmount, m.saldo), metodoPago: 'Efectivo', nota: '' };
    this.errorCobro = '';
  }

  cerrarCobro(): void {
    this.cobrando = null;
  }

  confirmarCobro(): void {
    if (!this.cobrando) return;
    const monto = Number(this.cobro.monto);
    if (!(monto > 0)) { this.errorCobro = 'Escribe un monto mayor a 0.'; return; }
    if (monto > this.cobrando.saldo + 0.01) { this.errorCobro = `El saldo pendiente es ${this.formatearPrecio(this.cobrando.saldo)}.`; return; }

    this.guardando = true;
    this.errorCobro = '';
    this.membresiasService.registrarPago(this.cobrando._id, {
      monto,
      metodoPago: this.cobro.metodoPago,
      nota: this.cobro.nota?.trim() || undefined
    }).subscribe({
      next: ({ membresia }) => {
        this.reemplazar(membresia);
        this.guardando = false;
        this.cobrando = null;
        this.swal.toast(membresia.estado === 'liquidada' ? 'Membresía liquidada' : `Pago de ${this.formatearPrecio(monto)} registrado`, '', 'success');
      },
      error: (err) => {
        this.errorCobro = err.error?.message || 'No se pudo registrar el pago.';
        this.guardando = false;
      }
    });
  }

  async anularPago(m: Membresia, p: PagoMembresia): Promise<void> {
    if (!p._id) return;
    const r = await this.swal.confirm(`Se quitará el pago de ${this.formatearPrecio(p.monto)} del ${new Date(p.fecha).toLocaleDateString('es-MX')} y saldrá del corte de ese día.`, '¿Anular este pago?');
    if (!r.isConfirmed) return;
    this.membresiasService.anularPago(m._id, p._id).subscribe({
      next: ({ membresia }) => { this.reemplazar(membresia); this.swal.toast('Pago anulado', '', 'success'); },
      error: (err) => this.swal.error(err.error?.message || 'No se pudo anular el pago.')
    });
  }

  async cancelar(m: Membresia): Promise<void> {
    const r = await this.swal.confirm(
      `${this.nombrePaciente(m)} — ${m.nombreTratamiento}. Ya no se esperarán más pagos. Lo cobrado no se reembolsa automáticamente.`,
      '¿Cancelar membresía?'
    );
    if (!r.isConfirmed) return;
    this.membresiasService.cancelar(m._id, 'Cancelada desde el panel').subscribe({
      next: ({ membresia }) => { this.reemplazar(membresia); this.swal.toast('Membresía cancelada', '', 'success'); },
      error: (err) => this.swal.error(err.error?.message || 'No se pudo cancelar.')
    });
  }

  archivar(m: Membresia): void {
    this.membresiasService.archivar(m._id).subscribe({
      next: () => { this.membresiasContratadas = this.membresiasContratadas.filter(x => x._id !== m._id); },
      error: () => this.swal.error('No se pudo archivar.')
    });
  }

  // ===== Venta en mostrador =====

  abrirVenta(): void {
    this.vendiendo = true;
    this.errorVenta = '';
    this.busquedaPaciente = '';
    this.venta = { pacienteId: '', catalogoId: '', engancheCobrado: false, metodoPago: 'Efectivo' };
    this.membresiasService.obtenerCatalogos().subscribe({
      next: (res) => {
        this.catalogos = res.catalogos || [];
        if (this.catalogos.length === 1) this.venta.catalogoId = this.catalogos[0]._id;
      }
    });
    if (this.pacientes.length === 0) {
      this.http.get<any[]>(`${environment.apiUrl}/pacientes`).subscribe({
        next: (data) => this.pacientes = data || [],
        error: () => this.errorVenta = 'No se pudo cargar la lista de pacientes.'
      });
    }
  }

  cerrarVenta(): void {
    this.vendiendo = false;
  }

  get pacientesFiltrados(): any[] {
    const q = this.normalizar(this.busquedaPaciente);
    if (q.length < 2) return [];
    return this.pacientes
      .filter(p => this.normalizar(`${p.nombre} ${p.apeP} ${p.apeM} ${p.telefonoPaciente || ''} ${p.telefonoWhatsapp || ''}`).includes(q))
      .slice(0, 8);
  }

  get pacienteVenta(): any {
    return this.pacientes.find(p => p._id === this.venta.pacienteId) || null;
  }

  get catalogoVenta(): any {
    return this.catalogos.find(c => c._id === this.venta.catalogoId) || null;
  }

  cuotaDe(c: any): number {
    return c ? calcularCuota(c.costoTotal, c.enganche, c.installmentsCount) : 0;
  }

  elegirPaciente(p: any): void {
    this.venta.pacienteId = p._id;
    this.busquedaPaciente = '';
  }

  confirmarVenta(): void {
    if (!this.venta.pacienteId) { this.errorVenta = 'Elige al paciente.'; return; }
    if (!this.venta.catalogoId) { this.errorVenta = 'Elige el plan.'; return; }

    this.guardando = true;
    this.errorVenta = '';
    this.membresiasService.vender(this.venta.catalogoId, this.venta.pacienteId, {
      engancheCobrado: this.venta.engancheCobrado,
      metodoPago: this.venta.engancheCobrado ? this.venta.metodoPago : undefined
    }).subscribe({
      next: ({ membresia, link, errorLink }) => {
        this.membresiasContratadas = [membresia, ...this.membresiasContratadas];
        this.guardando = false;
        this.vendiendo = false;
        this.filtro = membresia.status === 'pending' ? 'pendiente_pago' : 'vigentes';
        this.linkModal = { membresia, link, generando: false, error: errorLink || '', copiado: false };
      },
      error: (err) => {
        this.errorVenta = err.error?.message || 'No se pudo registrar la venta.';
        this.guardando = false;
      }
    });
  }

  // ===== Link de pago y cobro automático =====

  etiquetaCobro(m: Membresia): string {
    switch (m.cobroAutomatico?.estado) {
      case 'activo': return 'Cargo automático';
      case 'fallido': return 'Cargo rechazado';
      case 'detenido': return 'Cobro en clínica';
      case 'sin_tarjeta': return m.status === 'active' || m.status === 'pending' ? 'Esperando tarjeta' : '';
      default: return '';
    }
  }

  // Hace falta mandar link cuando no hay tarjeta que cobre sola
  necesitaLink(m: Membresia): boolean {
    if (m.status === 'pending') return true;
    return m.status === 'active' && m.cobroAutomatico?.estado !== 'activo';
  }

  private linkVigente(m: Membresia): LinkPago | null {
    const c = m.cobroAutomatico;
    if (!c?.linkUrl || !c.linkExpira || new Date(c.linkExpira) <= new Date()) return null;
    return { url: c.linkUrl, expira: c.linkExpira, primerCargo: '' };
  }

  abrirLink(m: Membresia): void {
    const vigente = this.linkVigente(m);
    this.linkModal = { membresia: m, link: vigente, generando: false, error: '', copiado: false };
    if (!vigente) this.generarLink();
  }

  generarLink(): void {
    if (!this.linkModal) return;
    const modal = this.linkModal;
    modal.generando = true;
    modal.error = '';
    modal.copiado = false;
    this.membresiasService.generarLink(modal.membresia._id).subscribe({
      next: ({ membresia, link }) => {
        this.reemplazar(membresia);
        modal.membresia = membresia;
        modal.link = link;
        modal.generando = false;
      },
      error: (err) => {
        modal.error = err.error?.message || 'No se pudo generar el link.';
        modal.generando = false;
      }
    });
  }

  cerrarLink(): void {
    this.linkModal = null;
  }

  async copiarLink(): Promise<void> {
    if (!this.linkModal?.link) return;
    try {
      await navigator.clipboard.writeText(this.linkModal.link.url);
      this.linkModal.copiado = true;
    } catch {
      this.linkModal.error = 'No se pudo copiar. Selecciona el link y cópialo a mano.';
    }
  }

  private textoLink(m: Membresia, url: string): string {
    const nombre = m.pacienteId?.apodo || m.pacienteId?.nombre || '';
    const cada = ({ semanal: 'cada semana', quincenal: 'cada 15 días', mensual: 'cada mes' } as Record<string, string>)[m.paymentFrequency];
    const conEnganche = m.status === 'pending';
    return [
      `Hola ${nombre}, te comparto el link de tu membresía ${m.nombreTratamiento} en ROME Harmony Clinic:`,
      url,
      conEnganche
        ? `Hoy pagas el enganche de ${this.formatearPrecio(m.enganche)} y las parcialidades de ${this.formatearPrecio(m.installmentAmount)} se cargan solas a tu tarjeta ${cada}.`
        : `Registra tu tarjeta y las parcialidades de ${this.formatearPrecio(m.installmentAmount)} se cargan solas ${cada}.`,
      'El link vence en 23 horas.'
    ].join('\n\n');
  }

  urlWhatsapp(): string {
    if (!this.linkModal?.link) return '';
    const m = this.linkModal.membresia;
    const tel = this.telefono(m).replace(/\D/g, '').slice(-10);
    const texto = encodeURIComponent(this.textoLink(m, this.linkModal.link.url));
    return tel.length === 10 ? `https://wa.me/52${tel}?text=${texto}` : `https://wa.me/?text=${texto}`;
  }

  async detenerCobro(m: Membresia): Promise<void> {
    const r = await this.swal.confirm(
      'La tarjeta ya no se cargará sola. Las parcialidades que falten se cobran en clínica con el botón Cobrar.',
      '¿Pasar a cobro en clínica?'
    );
    if (!r.isConfirmed) return;
    this.membresiasService.detenerCobro(m._id).subscribe({
      next: ({ membresia }) => { this.reemplazar(membresia); this.swal.toast('Cobro automático detenido', '', 'success'); },
      error: (err) => this.swal.error(err.error?.message || 'No se pudo detener el cobro.')
    });
  }
}
