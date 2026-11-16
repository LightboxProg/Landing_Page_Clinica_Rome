import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ServiciosService } from '../servicios/servicios.service';
import { ServiciosDentalesService } from '../servicios-dentales/servicios-dentales.service';
import { MembresiasService } from '../membresias/membresias.service';

export type TipoDescuento = 'Ninguno' | 'Porcentaje' | 'Monto';
export type AreaCotizacion = 'Estetica' | 'Dental' | 'Plan';
export type EstadoCotizacion = 'Pendiente' | 'Aceptada' | 'Rechazada';
export type FrecuenciaPago = 'semanal' | 'quincenal' | 'mensual';
// Link: el enganche se paga con el link de Stripe desde Membresías contratadas
export type MetodoAceptar = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Link';

export interface Descuento {
  tipo: TipoDescuento;
  valor: number;
}

export interface RenglonCotizacion {
  _id?: string;
  tipo: 'Servicio' | 'Plan';
  area: AreaCotizacion;
  refId: string;
  nombre?: string;
  sesiones: number;
  descuento: Descuento;
  // Sólo estética: tomar el precio de la promoción vigente (por omisión, sí)
  usarPromo?: boolean;
  // Lo calcula el backend
  precioLista?: number;
  promocion?: { promocionId: string; nombre: string; precio: number };
  importeLista?: number;
  importe?: number;
  usadas?: number;
  restantes?: number;
}

export interface PagoCotizacion {
  modalidad: 'Contado' | 'Plazos';
  enganche?: number;
  frecuencia?: FrecuenciaPago;
  parcialidades?: number;
  montoParcialidad?: number;
}

export interface TotalesCotizacion {
  lista: number;
  promociones: number;
  descuentosRenglon: number;
  descuentoEstetica: number;
  descuentoDental: number;
  descuentoGeneral: number;
  total: number;
}

// Lo que el panel manda para calcular o guardar
export interface DatosCotizacion {
  pacienteId: string;
  items: RenglonCotizacion[];
  descuentoEstetica: Descuento;
  descuentoDental: Descuento;
  descuentoGeneral: Descuento;
  pago: PagoCotizacion;
  vigenciaDias: number;
  notas: string;
}

export interface Cotizacion extends Omit<DatosCotizacion, 'pacienteId' | 'vigenciaDias'> {
  _id: string;
  folio: number;
  pacienteId: any;
  estado: EstadoCotizacion;
  totales: TotalesCotizacion;
  vigenciaHasta: string;
  vencida: boolean;
  membresiaId?: string;
  motivoRechazo?: string;
  aceptadaEl?: string;
  createdAt: string;
}

// Vista previa: lo mismo que se guardaría, sin folio ni estado
export type CalculoCotizacion = Omit<DatosCotizacion, 'vigenciaDias'> & { totales: TotalesCotizacion; vigenciaHasta: string };

// Lo que se puede agregar a una cotización
export interface OpcionCatalogo {
  tipo: 'Servicio' | 'Plan';
  area: AreaCotizacion;
  refId: string;
  nombre: string;
  precio: number;
  detalle: string;
}

export interface PagoProgramado {
  etiqueta: string;
  fecha: Date;
  monto: number;
}

export const FRECUENCIAS: Record<FrecuenciaPago, string> = { semanal: 'semanales', quincenal: 'quincenales', mensual: 'mensuales' };

export const dinero = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const textoPago = (p: PagoCotizacion | undefined | null): string => {
  if (!p || p.modalidad !== 'Plazos') return 'Pago de contado.';
  return `Enganche de ${dinero(p.enganche || 0)} y ${p.parcialidades} pagos ${FRECUENCIAS[p.frecuencia || 'mensual']} de ${dinero(p.montoParcialidad || 0)}.`;
};

// Fechas como las membresías: cada 7 días, cada 15 días o cada mes desde el enganche.
// El último pago absorbe los centavos que deja el redondeo de la cuota.
export const calendarioPagos = (pago: PagoCotizacion | undefined | null, total: number, desde = new Date()): PagoProgramado[] => {
  if (!pago || pago.modalidad !== 'Plazos' || !pago.parcialidades) return [{ etiqueta: 'Pago único', fecha: desde, monto: total }];
  const enganche = Number(pago.enganche) || 0;
  const cuota = Number(pago.montoParcialidad) || 0;
  const n = pago.parcialidades;
  const pagos: PagoProgramado[] = [{ etiqueta: 'Enganche', fecha: desde, monto: enganche }];
  for (let i = 1; i <= n; i++) {
    const fecha = new Date(desde);
    if (pago.frecuencia === 'mensual') fecha.setMonth(fecha.getMonth() + i);
    else fecha.setDate(fecha.getDate() + i * (pago.frecuencia === 'semanal' ? 7 : 15));
    const monto = i === n ? Math.round((total - enganche - cuota * (n - 1)) * 100) / 100 : cuota;
    pagos.push({ etiqueta: `Pago ${i} de ${n}`, fecha, monto });
  }
  return pagos;
};

@Injectable({ providedIn: 'root' })
export class CotizacionesService {
  private apiUrl = `${environment.apiUrl}/cotizaciones`;

  // Lo armado en el cotizador rápido, para seguir en el cotizador completo
  borrador: Partial<DatosCotizacion> | null = null;

  constructor(
    private http: HttpClient,
    private serviciosService: ServiciosService,
    private serviciosDentalesService: ServiciosDentalesService,
    private membresiasService: MembresiasService
  ) {}

  // Servicios estéticos y dentales activos y planes del catálogo; si una lista falla, las otras siguen
  catalogo(): Observable<OpcionCatalogo[]> {
    const activos = (lista: any[]) => (lista || []).filter((s: any) => s.activo !== false);
    const servicios = (area: 'Estetica' | 'Dental') => (lista: any[]): OpcionCatalogo[] => activos(lista)
      .map((s: any) => ({ tipo: 'Servicio', area, refId: s._id, nombre: s.nombre, precio: s.costo, detalle: s.duracion || '' }));
    return forkJoin([
      this.serviciosService.obtenerServicios().pipe(map(servicios('Estetica')), catchError(() => of([]))),
      this.serviciosDentalesService.obtenerServicios().pipe(map(servicios('Dental')), catchError(() => of([]))),
      this.membresiasService.obtenerCatalogos().pipe(
        map((res: any): OpcionCatalogo[] => (res?.catalogos || []).map((c: any) => ({
          tipo: 'Plan', area: 'Plan', refId: c._id, nombre: c.nombreTratamiento, precio: c.costoTotal,
          detalle: `Enganche ${dinero(c.enganche)} + ${c.installmentsCount} pagos ${FRECUENCIAS[c.paymentFrequency as FrecuenciaPago] || ''}`
        }))),
        catchError(() => of([]))
      )
    ]).pipe(map(listas => listas.flat().sort((a, b) => a.nombre.localeCompare(b.nombre))));
  }

  calcular(datos: DatosCotizacion): Observable<CalculoCotizacion> {
    return this.http.post<CalculoCotizacion>(`${this.apiUrl}/calcular`, datos);
  }

  listar(filtro: { pacienteId?: string; estado?: EstadoCotizacion } = {}): Observable<Cotizacion[]> {
    const params: Record<string, string> = {};
    if (filtro.pacienteId) params['pacienteId'] = filtro.pacienteId;
    if (filtro.estado) params['estado'] = filtro.estado;
    return this.http.get<Cotizacion[]>(this.apiUrl, { params });
  }

  obtener(id: string): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.apiUrl}/${id}`);
  }

  crear(datos: DatosCotizacion): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(this.apiUrl, datos);
  }

  actualizar(id: string, datos: DatosCotizacion): Observable<Cotizacion> {
    return this.http.put<Cotizacion>(`${this.apiUrl}/${id}`, datos);
  }

  aceptar(id: string, metodoPago: MetodoAceptar): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(`${this.apiUrl}/${id}/aceptar`, { metodoPago });
  }

  rechazar(id: string, motivo: string): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(`${this.apiUrl}/${id}/rechazar`, { motivo });
  }

  pdf(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' });
  }
}
