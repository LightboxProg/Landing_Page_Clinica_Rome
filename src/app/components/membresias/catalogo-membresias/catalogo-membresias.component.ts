import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembresiasService } from '../../../services/membresias/membresias.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-catalogo-membresias',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  providers: [MembresiasService],
  templateUrl: './catalogo-membresias.component.html',
  styleUrl: './catalogo-membresias.component.css'
})
export class CatalogoMembresiasComponent implements OnInit {
  membresias: any[] = [];
  loading: boolean = true;

  constructor(private membresiasService: MembresiasService) {}

  ngOnInit(): void {
    this.obtenerMembresias();
  }

  obtenerMembresias(): void {
    this.membresiasService.obtenerCatalogos().subscribe({
      next: (response) => {
        this.membresias = response.catalogos;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar membresías:', err);
        this.loading = false;
      }
    });
  }

  contratar(membresiaId: string): void {
    this.membresiasService.iniciarCheckout(membresiaId).subscribe({
      next: (response) => {
        if (response.url) {
          // Redirigir a Stripe Checkout
          window.location.href = response.url;
        }
      },
      error: (err) => {
        console.error('Error al iniciar checkout:', err);
        alert('Hubo un error al procesar la solicitud.');
      }
    });
  }
}
