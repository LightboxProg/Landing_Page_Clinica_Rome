import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DestinatarioEnvio, DetalleEnvio, EnvioMasivo, EstadoEntrega, WhatsappService
} from '../../../services/whatsapp/whatsapp.service';

type Filtro = 'todos' | 'sinConfirmar' | 'entregados' | 'leidos' | 'visto' | 'respondieron' | 'fallidos';

interface Kpi {
  etiqueta: string;
  valor: number;
  pct: number;
  icono: string;
  critico?: boolean;
}

const PREDICADOS: Record<Filtro, (d: DestinatarioEnvio) => boolean> = {
  todos: () => true,
  sinConfirmar: d => d.estado === 'pending' || d.estado === 'sent',
  entregados: d => d.estado === 'delivered' || d.estado === 'read',
  leidos: d => d.estado === 'read',
  visto: d => d.estado === 'read' && !d.respondio,
  respondieron: d => d.respondio,
  fallidos: d => d.estado === 'failed'
};

// Los estados siguen llegando por horas (sobre todo "leído"); pasado esto ya no se refresca solo
const VENTANA_REFRESCO_MS = 72 * 60 * 60 * 1000;

@Component({
  selector: 'app-historial-envios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historial-envios.component.html',
  styleUrl: './historial-envios.component.css'
})
export class HistorialEnviosComponent implements OnInit, OnChanges, OnDestroy {
  @Input() envioInicialId: string | null = null;

  envios: EnvioMasivo[] = [];
  detalle: DetalleEnvio | null = null;
  seleccionadoId: string | null = null;
  cargandoLista = true;
  actualizando = false;

  kpis: Kpi[] = [];
  conteos: Record<Filtro, number> = { todos: 0, sinConfirmar: 0, entregados: 0, leidos: 0, visto: 0, respondieron: 0, fallidos: 0 };
  filtro: Filtro = 'todos';

  readonly filtros: { clave: Filtro; etiqueta: string }[] = [
    { clave: 'todos', etiqueta: 'Todos' },
    { clave: 'entregados', etiqueta: 'Llegaron' },
    { clave: 'leidos', etiqueta: 'Leídos' },
    { clave: 'visto', etiqueta: 'Visto sin respuesta' },
    { clave: 'respondieron', etiqueta: 'Respondieron' },
    { clave: 'sinConfirmar', etiqueta: 'Sin confirmar' },
    { clave: 'fallidos', etiqueta: 'No entregados' }
  ];

  readonly estados: Record<EstadoEntrega, { etiqueta: string; icono: string }> = {
    pending: { etiqueta: 'En cola', icono: 'fas fa-clock' },
    sent: { etiqueta: 'Enviado', icono: 'fas fa-check' },
    delivered: { etiqueta: 'Llegó', icono: 'fas fa-check-double' },
    read: { etiqueta: 'Leído', icono: 'fas fa-check-double' },
    failed: { etiqueta: 'No entregado', icono: 'fas fa-exclamation-circle' }
  };

  private refresco?: ReturnType<typeof setInterval>;

  constructor(private whatsappService: WhatsappService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['envioInicialId'] && this.envioInicialId) {
      this.seleccionar(this.envioInicialId);
    }
  }

  ngOnInit() {
    this.cargarLista();
    this.refresco = setInterval(() => this.refrescar(), 10000);
  }

  ngOnDestroy() {
    clearInterval(this.refresco);
  }

  porId(_: number, item: { _id: string }) {
    return item._id;
  }

  porcentaje(valor: number, total: number): number {
    return total ? Math.round((valor / total) * 100) : 0;
  }

  cargarLista() {
    this.whatsappService.obtenerEnvios().subscribe({
      next: (envios) => {
        this.envios = envios;
        this.cargandoLista = false;
        if (!this.seleccionadoId && envios.length) this.seleccionar(envios[0]._id);
      },
      error: () => this.cargandoLista = false
    });
  }

  seleccionar(id: string) {
    if (this.seleccionadoId !== id) {
      this.seleccionadoId = id;
      this.detalle = null;
      this.filtro = 'todos';
    }
    this.cargarDetalle(id);
  }

  actualizarAhora() {
    if (!this.seleccionadoId) return;
    this.actualizando = true;
    this.cargarDetalle(this.seleccionadoId);
    this.cargarLista();
  }

  cargarDetalle(id: string) {
    this.whatsappService.obtenerEnvio(id).subscribe({
      next: (detalle) => {
        // Si se cambió de envío mientras cargaba, se descarta
        if (this.seleccionadoId !== id) return;
        this.detalle = detalle;
        this.actualizando = false;
        this.calcular(detalle);
        const enLista = this.envios.find(e => e._id === id);
        if (enLista) enLista.metricas = detalle.metricas;
      },
      error: () => this.actualizando = false
    });
  }

  private refrescar() {
    if (document.hidden || !this.detalle) return;
    const edad = Date.now() - new Date(this.detalle.createdAt).getTime();
    if (edad > VENTANA_REFRESCO_MS) return;
    this.cargarDetalle(this.detalle._id);
  }

  private calcular(d: DetalleEnvio) {
    const m = d.metricas;
    const kpi = (etiqueta: string, valor: number, icono: string, critico = false): Kpi =>
      ({ etiqueta, valor, pct: this.porcentaje(valor, m.total), icono, critico });

    this.kpis = [
      kpi('Llegaron', m.entregados, 'fas fa-check-double'),
      kpi('Leídos', m.leidos, 'fas fa-eye'),
      kpi('Respondieron', m.respondieron ?? 0, 'fas fa-reply'),
      kpi('Visto sin respuesta', m.vistoSinRespuesta ?? 0, 'fas fa-user-clock'),
      kpi('No entregados', m.fallidos, 'fas fa-exclamation-circle', true)
    ];

    for (const clave of Object.keys(PREDICADOS) as Filtro[]) {
      this.conteos[clave] = d.destinatarios.filter(PREDICADOS[clave]).length;
    }
  }

  get destinatariosFiltrados(): DestinatarioEnvio[] {
    return this.detalle ? this.detalle.destinatarios.filter(PREDICADOS[this.filtro]) : [];
  }

  fechaEstado(d: DestinatarioEnvio): string | null {
    return d.estado === 'read' ? d.fechaLectura : d.estado === 'delivered' ? d.fechaEntrega : null;
  }
}
