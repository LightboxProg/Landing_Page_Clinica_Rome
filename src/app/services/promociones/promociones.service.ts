import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TipoItem = 'Servicio' | 'Categoria' | 'Paquete';
export type TipoDescuento = 'Porcentaje' | 'MontoDescontado' | 'PrecioEspecial';

// Un renglón de la promoción. Servicio/Categoria llevan su descuento; Paquete
// agrupa servicios a precio fijo (combo) o como NxM (2x1).
export interface ItemPromocion {
  _id?: string;
  tipo: TipoItem;
  servicioId?: any;
  categoriaId?: any;
  tipoDescuento?: TipoDescuento;
  valor?: number | null;
  nombre?: string;
  formato?: 'Combo' | 'NxM';
  modalidad?: 'Visita' | 'Sesiones';
  servicios?: { servicioId: any; cantidad: number }[];
  lleva?: number | null;
  paga?: number | null;
  precio?: number | null;
}

export interface Promocion {
  _id?: string;
  nombre: string;
  descripcion?: string;
  items: ItemPromocion[];
  limites: { cupoTotal: number | null; unaVezPorPaciente: boolean };
  // Cómo se compra en la landing (escoger fecha o pago rápido) y si se cobra completo o anticipo
  pago?: { modo: 'Fecha' | 'Rapido'; tipo: 'Completo' | 'Anticipo'; anticipo: number | null };
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  fotos?: { url: string; key: string }[];
  usos?: number;
}

export interface PagoPromoSesion {
  clientSecret?: string;
  publishableKey?: string;
  url?: string;
  monto: number;
  cobro: 'completo' | 'anticipo';
}

export const ETIQUETAS_DESCUENTO: Record<TipoDescuento, string> = {
  Porcentaje: 'Porcentaje (%)',
  MontoDescontado: 'Monto descontado ($)',
  PrecioEspecial: 'Precio especial ($)'
};

// Misma regla que el backend (promociones.service.precioConItem): nunca sube el precio
export function precioConDescuento(costo: number, tipo?: TipoDescuento, valor?: number | null): number {
  const lista = Number(costo) || 0;
  const v = Number(valor) || 0;
  let precio = lista;
  if (tipo === 'Porcentaje') precio = lista * (1 - Math.min(v, 100) / 100);
  else if (tipo === 'MontoDescontado') precio = lista - v;
  else if (tipo === 'PrecioEspecial') precio = v;
  return Math.round(Math.min(lista, Math.max(0, precio)) * 100) / 100;
}

@Injectable({
  providedIn: 'root'
})
export class PromocionesService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  crearPromocion(promo: any): Observable<Promocion> {
    return this.http.post<Promocion>(`${this.apiUrl}/promociones`, promo);
  }

  actualizarPromocion(id: string, promo: any): Observable<Promocion> {
    return this.http.put<Promocion>(`${this.apiUrl}/promociones/${id}`, promo);
  }

  cambiarEstado(id: string, activo: boolean): Observable<{ _id: string; activo: boolean }> {
    return this.http.patch<{ _id: string; activo: boolean }>(`${this.apiUrl}/promociones/${id}/estado`, { activo });
  }

  obtenerPromociones(): Observable<Promocion[]> {
    return this.http.get<Promocion[]>(`${this.apiUrl}/promociones`);
  }

  eliminarPromocion(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/promociones/${id}`);
  }

  obtenerPrecioSugerido(servicioId: string, tipoCita?: string, pacienteId?: string): Observable<any> {
    const params: any = { servicioId };
    if (tipoCita) params.tipoCita = tipoCita;
    if (pacienteId) params.pacienteId = pacienteId;
    return this.http.get<any>(`${this.apiUrl}/promociones/calcular`, { params });
  }

  obtenerPromocionesActivas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/promociones/activas`);
  }

  // Activas que todavía no abren, la más cercana primero
  obtenerPromocionesProximas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/promociones/proximas`);
  }

  // Pago rápido: sólo número con lada y términos. Con clientSecret el formulario de Stripe
  // va dentro de la página; si no, `url` lleva al checkout de Stripe
  crearPagoPromo(datos: { promocionId: string; itemId: string; lada: string; telefono: string; aceptaTerminos: boolean }): Observable<PagoPromoSesion> {
    return this.http.post<PagoPromoSesion>(`${this.apiUrl}/promos/pago`, datos);
  }

  verificarPagoPromo(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/promos/pago/${sessionId}`);
  }

  // Admin: pagos rápidos (por defecto sólo los pagados)
  listarPagosPromo(filtros: { desde?: string; hasta?: string; estado?: string } = {}): Observable<any[]> {
    const params: any = {};
    for (const [clave, valor] of Object.entries(filtros)) if (valor) params[clave] = valor;
    return this.http.get<any[]>(`${this.apiUrl}/promos/pagos`, { params });
  }
}
