import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PromocionesService, precioConDescuento } from '../../services/promociones/promociones.service';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { RevealDirective } from '../../directives/reveal.directive';
import { PromoPortadaComponent } from '../../components/promo-portada/promo-portada.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule, RevealDirective, PromoPortadaComponent],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit, OnDestroy {
  readonly membresiasPublicas = environment.membresiasPublicas;
  showScrollButton = false;
  promocionesActivas: any[] = [];
  // La que cierra primero va de portada; las demás, en tarjetas debajo
  destacada: any = null;
  otrasPromos: any[] = [];
  // Sin nada vigente: la siguiente que abre, para la franja de cuenta regresiva
  proxima: any = null;
  faltaParaProxima = '';
  // Tratamientos con foto para la sección del inicio (los de promo, primero)
  tratamientos: any[] = [];
  timerInterval: any = null;

  constructor(private promosService: PromocionesService, private serviciosService: ServiciosService) {}

  ngOnInit(): void {
    this.cargarPromocionesLanding();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // Promociones vigentes y próximas, y el catálogo estético para la sección de tratamientos.
  // Cada petición falla por separado: sin catálogo la portada de promo sigue saliendo.
  cargarPromocionesLanding(): void {
    forkJoin({
      vigentes: this.promosService.obtenerPromocionesActivas().pipe(catchError(() => of([]))),
      proximas: this.promosService.obtenerPromocionesProximas().pipe(catchError(() => of([]))),
      servicios: this.serviciosService.obtenerServicios().pipe(catchError(() => of([])))
    }).subscribe(({ vigentes, proximas, servicios }) => {
      this.promocionesActivas = (vigentes || [])
        .map((p: any) => ({ ...p, fotoActivaIndex: 0 }))
        .sort((a: any, b: any) => new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime());
      this.destacada = this.promocionesActivas[0] || null;
      this.otrasPromos = this.promocionesActivas.slice(1);
      this.proxima = !this.destacada && proximas?.length
        ? [...proximas].sort((a: any, b: any) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())[0]
        : null;
      this.tratamientos = this.armarTratamientos(servicios || []);
      this.iniciarContadoresLanding();
    });
  }

  // Hasta 8 tratamientos estéticos activos: primero los que están en promoción, luego los que
  // tienen foto. Los que no tienen foto llevan la marca de la clínica en su lugar.
  private armarTratamientos(servicios: any[]): any[] {
    return servicios
      .filter(s => s.activo !== false)
      .map(s => {
        const promo = this.promoDeServicio(s);
        return {
          _id: s._id,
          nombre: s.nombre,
          categoria: s.categoria?.nombre || '',
          foto: this.fotoDe(s),
          costo: s.costo,
          promo
        };
      })
      .sort((a, b) => (Number(!!b.promo) - Number(!!a.promo)) || (Number(!!b.foto) - Number(!!a.foto)) || a.nombre.localeCompare(b.nombre, 'es'))
      .slice(0, 8);
  }

  // Mejor precio de promoción vigente para el servicio (misma regla que la página de agendar)
  private promoDeServicio(s: any): { precioFinal: number; promocion: string } | null {
    const categoriaId = s.categoria ? String(s.categoria._id || s.categoria) : null;
    let mejor: { precioFinal: number; promocion: string } | null = null;
    for (const p of this.promocionesActivas) {
      for (const item of p.items || []) {
        const aplica = (item.tipo === 'Servicio' && String(item.servicioId) === String(s._id))
          || (item.tipo === 'Categoria' && categoriaId && String(item.categoriaId) === categoriaId);
        if (!aplica || !s.costo) continue;
        const precioFinal = precioConDescuento(s.costo, item.tipoDescuento, item.valor);
        if (precioFinal < s.costo && (!mejor || precioFinal < mejor.precioFinal)) mejor = { precioFinal, promocion: p.nombre };
      }
    }
    return mejor;
  }

  // Igual que el catálogo: los logotipos y banners cargados por error no cuentan como foto
  private fotoDe(s: any): string | null {
    const url = s.foto?.url || s.fotos?.[0]?.url;
    if (!url) return null;
    const u = url.toLowerCase();
    return u.includes('canaco') || u.includes('logo') || u.includes('banner') ? null : url;
  }

  // La tarjeta muestra hasta cuatro renglones; el resto se resume en "y N más"
  itemsVisibles(p: any): any[] {
    return (p.items || []).slice(0, 4);
  }

  // Rótulo sobre el nombre: qué tipo de oferta es
  alcance(p: any): string {
    const items = p.items || [];
    if (items.length !== 1) return `${items.length} tratamientos`;
    if (items[0].tipo === 'Paquete') return items[0].modalidad === 'Sesiones' ? 'Paquete de sesiones' : 'Paquete';
    return items[0].tipo === 'Categoria' ? 'Categoría' : 'Tratamiento';
  }

  fotoSiguiente(p: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (p.fotos && p.fotos.length > 1) {
      p.fotoActivaIndex = (p.fotoActivaIndex + 1) % p.fotos.length;
    }
  }

  fotoAnterior(p: any, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (p.fotos && p.fotos.length > 1) {
      p.fotoActivaIndex = (p.fotoActivaIndex - 1 + p.fotos.length) % p.fotos.length;
    }
  }

  // Inicializa el timer de un segundo para actualizar la cuenta regresiva en el landing
  iniciarContadoresLanding(): void {
    const actualizar = () => {
      const ahora = new Date().getTime();
      if (this.proxima) {
        const falta = new Date(this.proxima.fechaInicio).getTime() - ahora;
        this.faltaParaProxima = falta > 0 ? this.calcularDiferenciaTiempo(falta) : '';
      }
      this.promocionesActivas.forEach(p => {
        const fin = new Date(p.fechaFin).getTime();
        const diff = fin - ahora;

        if (diff > 0) {
          p.tiempoRestanteStr = this.calcularDiferenciaTiempo(diff);
          // Under 24h the countdown switches to the urgency colour
          p.estadoTimer = diff < 1000 * 60 * 60 * 24 ? 'is-urgent' : 'is-live';
        } else {
          p.tiempoRestanteStr = 'Campaña finalizada';
          p.estadoTimer = 'is-ended';
        }
      });
    };

    actualizar();
    this.timerInterval = setInterval(actualizar, 1000);
  }

  // Calcula y formatea milisegundos a string regresivo
  calcularDiferenciaTiempo(milisegundos: number): string {
    const dias = Math.floor(milisegundos / (1000 * 60 * 60 * 24));
    const horas = Math.floor((milisegundos % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((milisegundos % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((milisegundos % (1000 * 60)) / 1000);

    const parts = [];
    if (dias > 0) parts.push(`${dias}d`);
    parts.push(`${horas.toString().padStart(2, '0')}h`);
    parts.push(`${minutos.toString().padStart(2, '0')}m`);
    parts.push(`${segundos.toString().padStart(2, '0')}s`);

    return parts.join(' ');
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (window.scrollY > 300) {
      this.showScrollButton = true;
    } else {
      this.showScrollButton = false;
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}