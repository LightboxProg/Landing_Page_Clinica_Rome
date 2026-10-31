import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

// Carrusel de fotos que llena a su contenedor (el contenedor pone el tamaño y el borde).
// Se desliza con el dedo (scroll-snap), con flechas o con los puntos; con una sola foto
// es una imagen normal. `intervalo` en ms lo hace avanzar solo (se pausa al pasar el mouse).
@Component({
  selector: 'app-carrusel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carrusel.component.html',
  styleUrl: './carrusel.component.css'
})
export class CarruselComponent implements OnInit, OnDestroy {
  @Input() fotos: string[] = [];
  @Input() alt = '';
  @Input() intervalo = 0;
  // Fotos que se cargan hasta que se ven (las de abajo de la página)
  @Input() perezoso = true;

  @ViewChild('pista') pista?: ElementRef<HTMLElement>;

  actual = 0;
  private reloj: any = null;
  private pausado = false;

  ngOnInit(): void {
    const sinMovimiento = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (this.intervalo > 0 && this.fotos.length > 1 && !sinMovimiento) {
      this.reloj = setInterval(() => {
        if (!this.pausado) this.ir((this.actual + 1) % this.fotos.length);
      }, this.intervalo);
    }
  }

  ngOnDestroy(): void {
    if (this.reloj) clearInterval(this.reloj);
  }

  pausar(valor: boolean): void {
    this.pausado = valor;
  }

  ir(indice: number): void {
    const pista = this.pista?.nativeElement;
    if (!pista) return;
    const total = this.fotos.length;
    this.actual = (indice + total) % total;
    pista.scrollTo({ left: this.actual * pista.clientWidth, behavior: 'smooth' });
  }

  // Al deslizar con el dedo, el punto activo sigue a la foto que quedó a la vista
  alDeslizar(): void {
    const pista = this.pista?.nativeElement;
    if (!pista || !pista.clientWidth) return;
    this.actual = Math.round(pista.scrollLeft / pista.clientWidth);
  }

  anterior(evento: Event): void {
    evento.stopPropagation();
    evento.preventDefault();
    this.ir(this.actual - 1);
  }

  siguiente(evento: Event): void {
    evento.stopPropagation();
    evento.preventDefault();
    this.ir(this.actual + 1);
  }

  punto(evento: Event, i: number): void {
    evento.stopPropagation();
    evento.preventDefault();
    this.ir(i);
  }
}
