import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembresiasService } from '../../../services/membresias/membresias.service';
import { HttpClientModule } from '@angular/common/http';

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
  imports: [CommonModule, HttpClientModule],
  providers: [MembresiasService],
  templateUrl: './catalogo-membresias.component.html',
  styleUrl: './catalogo-membresias.component.css'
})

export class CatalogoMembresiasComponent implements OnInit {
  membresias: CatalogoMembresia[] = [];
  loading = true;
  error: string | null = null;

  constructor(private membresiasService: MembresiasService) {}

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

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  }

  calcularPagoPeriodico(membresia: CatalogoMembresia): number {
    const saldo = membresia.costoTotal - membresia.enganche;
    return Math.ceil(saldo / membresia.installmentsCount);
  }

  getTextoFrecuencia(frecuencia: string): string {
    const mapa: Record<string, string> = {
      'semanal': 'semana',
      'quincenal': 'quincena',
      'mensual': 'mes'
    };
    return mapa[frecuencia] || frecuencia;
  }

  contratar(membresiaId: string): void {
    this.membresiasService.iniciarCheckout(membresiaId).subscribe({
      next: (response) => {
        if (response.url) {
          window.location.href = response.url;
        }
      },
      error: (err) => {
        console.error('Error al iniciar checkout:', err);
        alert('Hubo un error al procesar la solicitud. Por favor, intenta más tarde.');
      }
    });
  }

  trackByMembresia(index: number, item: CatalogoMembresia): string {
    return item._id;
  }
}