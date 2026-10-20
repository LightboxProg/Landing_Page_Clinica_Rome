import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MembresiasService, calcularCuota } from '../../../services/membresias/membresias.service';
import { HttpClientModule } from '@angular/common/http';
import { RevealDirective } from '../../../directives/reveal.directive';

interface CatalogoMembresia {
  _id: string;
  nombreTratamiento: string;
  descripcion: string;
  costoTotal: number;
  enganche: number;
  paymentFrequency: 'semanal' | 'quincenal' | 'mensual';
  installmentsCount: number;
  photoUrl?: string;
  photoKey?: string;
  activa: boolean;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-catalogo-membresias',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterLink, RevealDirective],
  providers: [MembresiasService],
  templateUrl: './catalogo-membresias.component.html',
  styleUrl: './catalogo-membresias.component.css'
})

export class CatalogoMembresiasComponent implements OnInit {
  membresias: CatalogoMembresia[] = [];
  loading = true;
  error: string | null = null;

  constructor(private membresiasService: MembresiasService, private router: Router) {}

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.membresiasService.obtenerCatalogos().subscribe({
      next: (response) => {
        this.membresias = response.catalogos || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar catálogo de membresías:', err);
        this.error = 'No se pudo cargar el catálogo. Intenta de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  // Centavos sólo cuando los hay, para no mostrar una cuota redondeada que no se cobra
  formatearPrecio(precio: number): string {
    const conCentavos = Math.round(precio * 100) % 100 !== 0;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: conCentavos ? 2 : 0,
      maximumFractionDigits: 2
    }).format(precio);
  }

  calcularPagoPeriodico(membresia: CatalogoMembresia): number {
    return calcularCuota(membresia.costoTotal, membresia.enganche, membresia.installmentsCount);
  }

  getTextoFrecuencia(frecuencia: string): string {
    const mapa: Record<string, string> = {
      'semanal': 'semana',
      'quincenal': 'quincena',
      'mensual': 'mes'
    };
    return mapa[frecuencia] || frecuencia;
  }

  contratar(catalogoId: string): void {
    this.router.navigate(['/pasarela-membresias', catalogoId]);
  }

  trackByMembresia(index: number, item: CatalogoMembresia): string {
    return item._id;
  }
}