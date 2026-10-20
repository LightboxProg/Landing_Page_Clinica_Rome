import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoMembresia = 'pendiente_pago' | 'al_corriente' | 'atrasada' | 'liquidada' | 'cancelada';
export type MetodoPagoMembresia = 'Efectivo' | 'Tarjeta' | 'Transferencia';

export interface PagoMembresia {
  _id?: string;
  tipo: 'enganche' | 'parcialidad';
  monto: number;
  metodoPago: MetodoPagoMembresia | 'Stripe';
  fecha: string;
  registradoPor?: string;
  nota?: string;
}

// Lo que regresa el backend: la membresía más su resumen calculado
export interface Membresia {
  _id: string;
  pacienteId: any;
  nombreTratamiento: string;
  costoTotal: number;
  enganche: number;
  paymentFrequency: 'semanal' | 'quincenal' | 'mensual';
  installmentsCount: number;
  installmentAmount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  fechaActivacion?: string;
  motivoCancelacion?: string;
  createdAt: string;
  pagos: PagoMembresia[];
  totalPagado: number;
  saldo: number;
  parcialidadesCubiertas: number;
  proximoPago: { numero: number; fecha: string; monto: number } | null;
  diasAtraso: number;
  estado: EstadoMembresia;
  cobroAutomatico?: {
    estado: 'sin_tarjeta' | 'activo' | 'fallido' | 'detenido' | 'terminado';
    linkUrl?: string;
    linkExpira?: string;
    linkIncluyeEnganche?: boolean;
    ultimoError?: string;
  };
}

export interface LinkPago {
  url: string;
  expira: string;
  primerCargo: string;
}

export const ETIQUETAS_ESTADO: Record<EstadoMembresia, string> = {
  pendiente_pago: 'Pago pendiente',
  al_corriente: 'Al corriente',
  atrasada: 'Atrasada',
  liquidada: 'Liquidada',
  cancelada: 'Cancelada'
};

// Igual que el backend: centavos redondeados; la última parcialidad absorbe la diferencia
export function calcularCuota(costoTotal: number, enganche: number, cuotas: number): number {
  return Math.round(((Number(costoTotal) - Number(enganche)) / Math.max(1, Number(cuotas) || 1)) * 100) / 100;
}

@Injectable({
  providedIn: 'root'
})
export class MembresiasService {

  private apiUrl = `${environment.apiUrl}/membresias`;

  constructor(private http: HttpClient) {}

  // Catálogos
  obtenerCatalogos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogos`);
  }

  // Incluye las desactivadas (panel)
  obtenerCatalogosAdmin(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogos/todos`);
  }

  obtenerCatalogo(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogos/${id}`);
  }

  // Envía FormData para soportar foto vía multer
  crearCatalogo(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/catalogos`, formData);
  }

  actualizarCatalogo(id: string, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/catalogos/${id}`, formData);
  }

  eliminarCatalogo(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/catalogos/${id}`);
  }

  // Checkout
  iniciarCheckout(catalogoId: string, pacienteId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/checkout`, { catalogoId, pacienteId });
  }

  verificarCheckout(sessionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/checkout/${sessionId}`);
  }

  // Obtener Membresías (Admin)
  obtenerMembresias(): Observable<Membresia[]> {
    return this.http.get<Membresia[]>(this.apiUrl);
  }

  // Obtener membresías de un paciente específico
  obtenerMembresiasPorPaciente(pacienteId: string): Observable<Membresia[]> {
    return this.http.get<Membresia[]>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  // Venta en recepción o consultorio: siempre regresa un link para que el paciente deje su tarjeta.
  // Con engancheCobrado el link sólo cubre las parcialidades.
  vender(catalogoId: string, pacienteId: string, opciones: { engancheCobrado: boolean; metodoPago?: MetodoPagoMembresia }): Observable<{ membresia: Membresia; link: LinkPago | null; errorLink?: string }> {
    return this.http.post<{ membresia: Membresia; link: LinkPago | null; errorLink?: string }>(this.apiUrl, { catalogoId, pacienteId, ...opciones });
  }

  generarLink(id: string): Observable<{ membresia: Membresia; link: LinkPago }> {
    return this.http.post<{ membresia: Membresia; link: LinkPago }>(`${this.apiUrl}/${id}/link`, {});
  }

  detenerCobro(id: string): Observable<{ membresia: Membresia }> {
    return this.http.post<{ membresia: Membresia }>(`${this.apiUrl}/${id}/detener-cobro`, {});
  }

  registrarPago(id: string, pago: { monto: number; metodoPago: MetodoPagoMembresia; nota?: string }): Observable<{ membresia: Membresia }> {
    return this.http.post<{ membresia: Membresia }>(`${this.apiUrl}/${id}/pagos`, pago);
  }

  anularPago(id: string, pagoId: string): Observable<{ membresia: Membresia }> {
    return this.http.delete<{ membresia: Membresia }>(`${this.apiUrl}/${id}/pagos/${pagoId}`);
  }

  cancelar(id: string, motivo: string): Observable<{ membresia: Membresia }> {
    return this.http.post<{ membresia: Membresia }>(`${this.apiUrl}/${id}/cancelar`, { motivo });
  }

  archivar(id: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, { archivada: true });
  }
}
