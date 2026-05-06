import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MembresiasService } from '../../../services/membresias/membresias.service';

@Component({
  selector: 'app-membresias-adquiridas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './membresias-adquiridas.component.html',
  styleUrl: './membresias-adquiridas.component.css'
})
export class MembresiasAdquiridasComponent implements OnInit {
  membresiasContratadas: any[] = [];
  loading = true;
  error = '';
  accesoDenegado = false;

  constructor(private membresiasService: MembresiasService) {}

  ngOnInit(): void {
    this.cargarMembresias();
  }

  cargarMembresias(): void {
    this.loading = true;
    this.accesoDenegado = false;
    this.membresiasService.obtenerMembresias().subscribe({
      next: (data) => {
        this.membresiasContratadas = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar membresías adquiridas:', err);
        this.accesoDenegado = err?.status === 401 || err?.status === 403;
        this.error = this.accesoDenegado
          ? 'Tu sesión no tiene permisos para ver este panel. Inicia sesión como administrador.'
          : 'No se pudieron cargar las membresías contratadas.';
        this.loading = false;
      }
    });
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(precio || 0);
  }
}
