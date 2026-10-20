import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { MembresiasService, calcularCuota } from '../../../services/membresias/membresias.service';
import { Paciente, PacientesService } from '../../../services/pacientes/pacientes.service';

@Component({
  selector: 'app-pasarela-membresias',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
  providers: [MembresiasService, PacientesService],
  templateUrl: './pasarela-membresias.component.html',
  styleUrl: './pasarela-membresias.component.css'
})
export class PasarelaMembresiasComponent implements OnInit {
  catalogoId: string | null = null;
  paso: 1 | 2 | 3 = 1;
  catalogo: any = null;
  cargandoCatalogo = true;
  catalogoNoDisponible = false;

  // Paso 1: Búsqueda
  telefonoBusqueda: string = '';
  buscando: boolean = false;
  errorBusqueda: string = '';

  // Paso 2: Registro (ahora con todas las propiedades requeridas)
  nuevoPaciente: Paciente = {
    nombre: '',
    apeP: '',
    apeM: '',
    apodo: '',
    telefonoWhatsapp: '',       // se llenará con telefonoPaciente
    telefonoPaciente: '',
    correoElectronico: '',
    genero: 'Otro',            // valor por defecto
    fechaNac: new Date(),      // valor por defecto (cambiar si capturas fecha)
    enListaNegra: false,
    finado: false
  };
  registrando: boolean = false;
  errorRegistro: string = '';

  // Paso 3: Confirmación
  pacienteEncontrado: any = null;
  procesandoPago: boolean = false;
  errorPago: string = '';

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
      return;
    }
    this.cargarCatalogoDetalle();
  }

  cargarCatalogoDetalle(): void {
    if (!this.catalogoId) return;
    this.membresiasService.obtenerCatalogo(this.catalogoId).subscribe({
      next: (res) => {
        this.catalogo = res.catalogo;
        this.cargandoCatalogo = false;
      },
      error: () => {
        this.catalogoNoDisponible = true;
        this.cargandoCatalogo = false;
      }
    });
  }

  private soloDigitos(valor: string): string {
    return String(valor || '').replace(/\D/g, '');
  }

  buscarPaciente(): void {
    const telefono = this.soloDigitos(this.telefonoBusqueda);
    if (telefono.length !== 10) {
      this.errorBusqueda = 'Escribe tu teléfono a 10 dígitos, sin lada ni espacios.';
      return;
    }
    this.telefonoBusqueda = telefono;

    this.buscando = true;
    this.errorBusqueda = '';

    this.pacientesService.buscarPorTelefono(telefono).subscribe({
      next: (paciente) => {
        this.pacienteEncontrado = paciente;
        this.paso = 3;
        this.buscando = false;
      },
      error: (err) => {
        this.buscando = false;
        if (err.status === 404) {
          // Paso de pre-registro: asignar teléfono y sincronizar telefonoWhatsapp
          this.nuevoPaciente.telefonoPaciente = telefono;
          this.nuevoPaciente.telefonoWhatsapp = telefono;
          this.paso = 2;
        } else {
          this.errorBusqueda = 'No pudimos buscar tu expediente. Intenta de nuevo.';
        }
      }
    });
  }

  registrarPaciente(): void {
    const p = this.nuevoPaciente;
    if (!p.nombre?.trim() || !p.apeP?.trim() || !p.apeM?.trim()) {
      this.errorRegistro = 'Escribe tu nombre y tus dos apellidos.';
      return;
    }
    const telefono = this.soloDigitos(String(p.telefonoPaciente));
    if (telefono.length !== 10) {
      this.errorRegistro = 'El teléfono debe tener 10 dígitos.';
      return;
    }
    if (p.correoElectronico && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correoElectronico)) {
      this.errorRegistro = 'Revisa tu correo electrónico.';
      return;
    }

    // El expediente exige apodo; si no lo dan, se usa el nombre
    const payload = {
      ...p,
      nombre: p.nombre.trim(),
      apeP: p.apeP.trim(),
      apeM: p.apeM.trim(),
      apodo: p.apodo?.trim() || p.nombre.trim(),
      telefonoPaciente: Number(telefono),
      telefonoWhatsapp: Number(telefono)
    } as any;

    this.registrando = true;
    this.errorRegistro = '';

    this.pacientesService.crearPaciente(payload).subscribe({
      next: (paciente) => {
        this.pacienteEncontrado = paciente;
        this.telefonoBusqueda = telefono;
        this.paso = 3;
        this.registrando = false;
      },
      error: (err) => {
        console.error('Error al registrar paciente:', err);
        this.errorRegistro = 'No pudimos crear tu expediente. Revisa tus datos e intenta de nuevo.';
        this.registrando = false;
      }
    });
  }

  procederAlPago(): void {
    if (!this.catalogoId || !this.pacienteEncontrado?._id) return;

    this.procesandoPago = true;
    this.errorPago = '';
    this.membresiasService.iniciarCheckout(this.catalogoId, this.pacienteEncontrado._id).subscribe({
      next: (response) => {
        if (response.url) {
          window.location.href = response.url;
        } else {
          this.errorPago = 'No se pudo abrir el pago. Intenta de nuevo.';
          this.procesandoPago = false;
        }
      },
      error: (err) => {
        console.error('Error al iniciar checkout:', err);
        this.errorPago = err.error?.message || 'No se pudo abrir el pago. Intenta de nuevo.';
        this.procesandoPago = false;
      }
    });
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(precio || 0);
  }

  obtenerMontoPorCuota(): number {
    if (!this.catalogo) return 0;
    return calcularCuota(this.catalogo.costoTotal, this.catalogo.enganche, this.catalogo.installmentsCount);
  }

  textoFrecuencia(frecuencia: string): string {
    return ({ semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' } as Record<string, string>)[frecuencia] || frecuencia;
  }

  volver(): void {
    if (this.paso === 2) {
      this.paso = 1;
    } else if (this.paso === 3) {
      this.pacienteEncontrado = null;
      this.errorPago = '';
      this.paso = 1;
    }
  }
}