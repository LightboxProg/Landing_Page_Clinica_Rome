import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PromocionesService } from '../../services/promociones/promociones.service';
import { RevealDirective } from '../../directives/reveal.directive';

// Las promociones abren y cierran por día en la zona de la clínica
const ZONA = 'America/Mexico_City';

interface Cuenta {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
}

@Component({
  selector: 'app-promociones',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective],
  templateUrl: './promociones.component.html',
  styleUrl: './promociones.component.css'
})
export class PromocionesComponent implements OnInit, OnDestroy {
  vigentes: any[] = [];
  proximas: any[] = [];
  cargando = true;
  error = '';

  // Cuenta regresiva a la apertura de la próxima promoción
  aperturaSiguiente: Date | null = null;
  aperturaTexto = '';
  cuenta: Cuenta = { dias: 0, horas: 0, minutos: 0, segundos: 0 };
  private reloj: any = null;

  constructor(private promosService: PromocionesService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    if (this.reloj) clearInterval(this.reloj);
  }

  cargar(): void {
    this.cargando = true;
    forkJoin({
      vigentes: this.promosService.obtenerPromocionesActivas(),
      proximas: this.promosService.obtenerPromocionesProximas()
    }).subscribe({
      next: ({ vigentes, proximas }) => {
        this.vigentes = (vigentes || []).map(p => this.conFechas(p));
        this.proximas = (proximas || []).map(p => this.conFechas(p));
        this.aperturaSiguiente = this.proximas.length ? new Date(this.proximas[0].fechaInicio) : null;
        this.aperturaTexto = this.aperturaSiguiente ? this.formatoApertura(this.aperturaSiguiente) : '';
        this.cargando = false;
        this.iniciarReloj();
      },
      error: () => {
        this.error = 'No pudimos cargar las promociones. Intenta de nuevo en unos minutos.';
        this.cargando = false;
      }
    });
  }

  // Un solo reloj para la cuenta de apertura y el cierre de cada promo vigente.
  // Cuando una próxima abre, se recarga para que pase a vigentes.
  private iniciarReloj(): void {
    if (this.reloj) clearInterval(this.reloj);
    const tic = () => {
      const ahora = Date.now();

      if (this.aperturaSiguiente) {
        const falta = this.aperturaSiguiente.getTime() - ahora;
        if (falta <= 0) {
          clearInterval(this.reloj);
          this.cargar();
          return;
        }
        this.cuenta = this.desglosar(falta);
      }

      for (const p of this.vigentes) {
        const falta = new Date(p.fechaFin).getTime() - ahora;
        p.cierre = falta > 0 ? this.relojCorto(falta) : 'Cerrada';
        p.urgente = falta > 0 && falta < 1000 * 60 * 60 * 24;
      }
      for (const p of this.proximas) {
        const falta = new Date(p.fechaInicio).getTime() - ahora;
        p.apertura = falta > 0 ? this.relojCorto(falta) : 'Abriendo';
      }
    };
    tic();
    this.reloj = setInterval(tic, 1000);
  }

  // Las fechas se formatean una vez aquí (Intl, sin registrar el locale de Angular)
  private conFechas(p: any): any {
    const corta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: ZONA });
    const conAnio = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: ZONA });
    const inicio = new Date(p.fechaInicio);
    return { ...p, desde: corta.format(inicio), rango: `${corta.format(inicio)} — ${conAnio.format(new Date(p.fechaFin))}` };
  }

  // "lunes 19 de octubre a las 00:00 h"
  private formatoApertura(fecha: Date): string {
    const dia = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA }).format(fecha);
    const hora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: ZONA }).format(fecha);
    return `${dia.replace(',', '')} a las ${hora} h`;
  }

  private desglosar(ms: number): Cuenta {
    return {
      dias: Math.floor(ms / 86400000),
      horas: Math.floor((ms % 86400000) / 3600000),
      minutos: Math.floor((ms % 3600000) / 60000),
      segundos: Math.floor((ms % 60000) / 1000)
    };
  }

  private relojCorto(ms: number): string {
    const c = this.desglosar(ms);
    const dd = (n: number) => String(n).padStart(2, '0');
    return `${c.dias > 0 ? c.dias + 'd ' : ''}${dd(c.horas)}h ${dd(c.minutos)}m ${dd(c.segundos)}s`;
  }

  // "1 día con 6 horas", "3 días", "5 horas", "40 minutos"
  get cuentaEnPalabras(): string {
    const { dias, horas, minutos } = this.cuenta;
    const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
    if (dias > 0) {
      return horas > 0
        ? `${plural(dias, 'día', 'días')} con ${plural(horas, 'hora', 'horas')}`
        : plural(dias, 'día', 'días');
    }
    if (horas > 0) return `${plural(horas, 'hora', 'horas')} con ${plural(minutos, 'minuto', 'minutos')}`;
    return plural(Math.max(minutos, 1), 'minuto', 'minutos');
  }

  dosDigitos(n: number): string {
    return String(n).padStart(2, '0');
  }

  // Liga de agendar de un renglón: el servicio (o el paquete) va preseleccionado
  // y el precio de promoción se aplica al pagar el anticipo.
  agendarParams(item: any, promo: any): any {
    if (item.tipo === 'Servicio') return { servicio: item.servicioId };
    if (item.tipo === 'Paquete') return { promo: promo._id, paquete: item._id };
    return null;
  }

  nombreItem(item: any): string {
    return item.tipo === 'Categoria' ? `Todo ${item.nombre}` : item.nombre;
  }

  detallePaquete(item: any): string {
    const servicios = (item.servicios || [])
      .map((s: any) => (s.cantidad > 1 ? `${s.cantidad} × ${s.nombre}` : s.nombre))
      .join(' + ');
    const modalidad = item.modalidad === 'Sesiones' ? 'Sesiones a favor' : 'En una visita';
    return servicios ? `${servicios} · ${modalidad}` : modalidad;
  }

  trackById(_: number, x: any): string {
    return x._id;
  }
}
