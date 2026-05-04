import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MembresiasService } from '../../../services/membresias/membresias.service';

@Component({
  selector: 'app-membresias-adquiridas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './membresias-adquiridas.component.html',
  styleUrl: './membresias-adquiridas.component.css'
})
export class MembresiasAdquiridasComponent implements OnInit {
  membresiasContratadas: any[] = [];
  loading = true;
  error = '';

  constructor(private membresiasService: MembresiasService) {}

  ngOnInit(): void {
    this.cargarMembresias();
  }

  cargarMembresias(): void {
    this.loading = true;
    this.membresiasService.obtenerMembresias().subscribe({
      next: (data) => {
        this.membresiasContratadas = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar membresías adquiridas:', err);
        this.error = 'No se pudieron cargar las membresías contratadas.';
        this.loading = false;
      }
    });
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(precio || 0);
  }
}
