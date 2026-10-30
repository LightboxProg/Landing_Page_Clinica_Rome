import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Portada de una promoción vigente: banner (su primera foto), reloj de cierre y sus precios
// con Agendar a la mano. La usan el inicio y la página de promociones.
@Component({
  selector: 'app-promo-portada',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './promo-portada.component.html',
  styleUrl: './promo-portada.component.css'
})
export class PromoPortadaComponent implements OnInit, OnDestroy {
  @Input() promo: any = null;
  // En /promociones ya se está viendo la promo: no hace falta el botón que lleva ahí
  @Input() enlacePromociones = true;
  // Tarjetas que caben en la portada; el resto está en /promociones
  @Input() maxItems = 4;

  cierre = '';
  urgente = false;
  private reloj: any = null;

  ngOnInit(): void {
    const actualizar = () => {
      const falta = new Date(this.promo?.fechaFin).getTime() - Date.now();
      this.cierre = falta > 0 ? this.relojCorto(falta) : 'cerrada';
      this.urgente = falta > 0 && falta < 1000 * 60 * 60 * 24;
    };
    actualizar();
    this.reloj = setInterval(actualizar, 1000);
  }

  ngOnDestroy(): void {
    if (this.reloj) clearInterval(this.reloj);
  }

  // "6d 22h 19m 13s"
  private relojCorto(ms: number): string {
    const dias = Math.floor(ms / 86400000);
    const horas = Math.floor((ms % 86400000) / 3600000);
    const minutos = Math.floor((ms % 3600000) / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${dias > 0 ? dias + 'd ' : ''}${dos(horas)}h ${dos(minutos)}m ${dos(segundos)}s`;
  }

  // A dónde lleva "Agendar/Comprar" de cada renglón; las categorías no tienen un servicio que agendar.
  // Si la promo es de pago rápido, servicios y paquetes se pagan sólo con número en /pagar-promo.
  esPagoRapido(promo: any): boolean {
    return promo?.pago?.modo !== 'Fecha';
  }

  enlaceItem(item: any, promo: any): { ruta: string; params: any } | null {
    if (this.esPagoRapido(promo) && (item.tipo === 'Servicio' || item.tipo === 'Paquete')) {
      return { ruta: '/pagar-promo', params: { promo: promo._id, item: item._id } };
    }
    const params = this.agendarParams(item, promo);
    return params ? { ruta: '/agendar-cita', params } : null;
  }

  agendarParams(item: any, promo: any): any {
    if (item.tipo === 'Servicio') return { servicio: item.servicioId };
    if (item.tipo === 'Paquete') return { promo: promo._id, paquete: item._id };
    return null;
  }

  // Baja a las tarjetas de precios
  irAPrecios(destino: HTMLElement): void {
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // "2 × Limpieza Facial Profunda · Botox - 1 Zona"
  detallePaquete(item: any): string {
    return (item.servicios || []).map((s: any) => (s.cantidad > 1 ? `${s.cantidad} × ${s.nombre}` : s.nombre)).join(' · ');
  }

  portadaDe(p: any): string | null {
    return p?.fotos?.[0]?.url || p?.foto?.url || null;
  }

  // Mayor porcentaje de ahorro entre los renglones con precio (para la portada sin foto)
  mayorAhorro(p: any): number {
    const pct = (p?.items || [])
      .filter((i: any) => i.precioLista > 0 && i.precioFinal != null && i.precioFinal < i.precioLista)
      .map((i: any) => Math.round((1 - i.precioFinal / i.precioLista) * 100));
    return pct.length ? Math.max(...pct) : 0;
  }

  // "del 23 al 30 de octubre"
  rangoDe(p: any): string {
    const fmt = (d: string, mes: boolean) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', ...(mes ? { month: 'long' } : {}), timeZone: 'America/Mexico_City' });
    const mismoMes = new Date(p.fechaInicio).getMonth() === new Date(p.fechaFin).getMonth();
    return `del ${fmt(p.fechaInicio, !mismoMes)} al ${fmt(p.fechaFin, true)}`;
  }
}
