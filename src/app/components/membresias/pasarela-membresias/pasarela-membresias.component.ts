import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MembresiasService } from '../../../services/membresias/membresias.service';
import { PacientesService } from '../../../services/pacientes/pacientes.service';

@Component({
  selector: 'app-pasarela-membresias',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  providers: [MembresiasService, PacientesService],
  templateUrl: './pasarela-membresias.component.html',
  styleUrl: './pasarela-membresias.component.css'
})
export class PasarelaMembresiasComponent implements OnInit {
  catalogoId: string | null = null;
  paso: 1 | 2 | 3 = 1;

  // Paso 1: Búsqueda
  telefonoBusqueda: string = '';
  buscando: boolean = false;
  errorBusqueda: string = '';

  // Paso 2: Registro (si no existe)
  nuevoPaciente = {
    nombre: '',
    apeP: '',
    apeM: '',
    apodo: '',
    telefonoPaciente: '',
    correoElectronico: ''
  };
  registrando: boolean = false;
  errorRegistro: string = '';

  // Paso 3: Confirmación
  pacienteEncontrado: any = null;
  procesandoPago: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private membresiasService: MembresiasService,
    private pacientesService: PacientesService
  ) {}

  ngOnInit(): void {
    this.catalogoId = this.route.snapshot.paramMap.get('id');
    if (!this.catalogoId) {
      this.router.navigate(['/membresias']);
    }
  }

  buscarPaciente(): void {
    if (!this.telefonoBusqueda) {
      this.errorBusqueda = 'Ingresa un número de teléfono';
      return;
    }
    
    this.buscando = true;
    this.errorBusqueda = '';

    this.pacientesService.buscarPorTelefono(this.telefonoBusqueda).subscribe({
      next: (paciente) => {
        this.pacienteEncontrado = paciente;
        this.paso = 3;
        this.buscando = false;
      },
      error: (err) => {
        console.warn('Paciente no encontrado:', err);
        this.buscando = false;
        if (err.status === 404) {
          // Ir al paso de pre-registro
          this.nuevoPaciente.telefonoPaciente = this.telefonoBusqueda;
          this.paso = 2;
        } else {
          this.errorBusqueda = 'Error al buscar el paciente. Intenta de nuevo.';
        }
      }
    });
  }

  registrarPaciente(): void {
    if (!this.nuevoPaciente.nombre || !this.nuevoPaciente.apeP || !this.nuevoPaciente.apeM || !this.nuevoPaciente.telefonoPaciente || !this.nuevoPaciente.apodo) {
      this.errorRegistro = 'Por favor, completa los campos obligatorios.';
      return;
    }

    this.registrando = true;
    this.errorRegistro = '';

    this.pacientesService.crearPaciente(this.nuevoPaciente).subscribe({
      next: (paciente) => {
        this.pacienteEncontrado = paciente;
        this.paso = 3;
        this.registrando = false;
      },
      error: (err) => {
        console.error('Error al registrar paciente:', err);
        this.errorRegistro = 'Hubo un error al registrar. Verifica tus datos.';
        this.registrando = false;
      }
    });
  }

  procederAlPago(): void {
    if (!this.catalogoId || !this.pacienteEncontrado?._id) return;

    this.procesandoPago = true;
    this.membresiasService.iniciarCheckout(this.catalogoId, this.pacienteEncontrado._id).subscribe({
      next: (response) => {
        if (response.url) {
          window.location.href = response.url;
        }
      },
      error: (err) => {
        console.error('Error al iniciar checkout:', err);
        alert('Hubo un error al procesar el pago. Por favor, intenta de nuevo.');
        this.procesandoPago = false;
      }
    });
  }

  volver(): void {
    if (this.paso === 2) {
      this.paso = 1;
    } else if (this.paso === 3) {
      this.pacienteEncontrado = null;
      this.paso = 1;
    }
  }
}
