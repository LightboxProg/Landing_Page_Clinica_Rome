import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PromocionesService } from '../../services/promociones/promociones.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements OnInit, OnDestroy {
  showScrollButton = false;
  promocionesActivas: any[] = [];
  timerInterval: any = null;

  constructor(private promosService: PromocionesService) {}

  ngOnInit(): void {
    this.cargarPromocionesLanding();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // Carga promociones vigentes de forma publica e inicia los relojes regresivos
  cargarPromocionesLanding(): void {
    this.promosService.obtenerPromocionesActivas().subscribe({
      next: (data) => {
        this.promocionesActivas = data.map((p: any) => ({
          ...p,
          fotoActivaIndex: 0
        }));
        this.iniciarContadoresLanding();
      },
      error: (err) => console.error('Error al cargar promos para landing:', err)
    });
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
      this.promocionesActivas.forEach(p => {
        const fin = new Date(p.fechaFin).getTime();
        const diff = fin - ahora;

        if (diff > 0) {
          p.tiempoRestanteStr = this.calcularDiferenciaTiempo(diff);
        } else {
          p.tiempoRestanteStr = 'Campaña Finalizada';
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