import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AceptacionesService } from '../../services/aceptaciones/aceptaciones.service';
import { SwalService } from '../../services/swal/swal.service';

// Enlaces para que quien pagó por OXXO, transferencia, etc. acepte términos y aviso
// de privacidad. Recepción crea el enlace, lo manda por WhatsApp y aquí ve quién aceptó.
@Component({
  selector: 'app-aceptaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aceptaciones.component.html',
  styleUrls: ['../pagos-promo/pagos-promo.component.css', './aceptaciones.component.css']
})
export class AceptacionesComponent implements OnInit {
  readonly metodos = ['OXXO', 'Transferencia', 'Efectivo', 'Tarjeta', 'Otro'];

  lista: any[] = [];
  cargando = false;
  error = '';
  estado = 'todos';
  busqueda = '';

  // Formulario de nuevo enlace
  concepto = '';
  metodoPago = 'OXXO';
  monto: number | null = null;
  telefonoEnvio = '';
  creando = false;
  // El último enlace creado, para copiarlo o mandarlo
  nuevo: any = null;

  constructor(private aceptaciones: AceptacionesService, private swal: SwalService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.aceptaciones.listar(this.estado).subscribe({
      next: (lista) => {
        this.lista = lista || [];
        this.cargando = false;
      },
      error: () => {
        this.error = 'No pudimos cargar las aceptaciones.';
        this.cargando = false;
      }
    });
  }

  crear(): void {
    if (!this.concepto.trim() || this.creando) return;
    this.creando = true;
    this.aceptaciones.crear({
      concepto: this.concepto.trim(),
      metodoPago: this.metodoPago,
      monto: this.monto,
      telefonoEnvio: this.telefonoEnvio
    }).subscribe({
      next: (a) => {
        this.nuevo = a;
        this.concepto = '';
        this.monto = null;
        this.telefonoEnvio = '';
        this.creando = false;
        this.cargar();
      },
      error: (err) => {
        this.creando = false;
        this.swal.error(err?.error?.message || 'No pudimos crear el enlace.');
      }
    });
  }

  enlace(a: any): string {
    return `${window.location.origin}/aceptar/${a.codigo}`;
  }

  // Enlace fijo: no hay que crearlo, sirve para todos
  readonly enlacePublico = `${window.location.origin}/aceptar`;

  async copiarPublico(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.enlacePublico);
      this.swal.success('Enlace copiado');
    } catch {
      this.swal.warning(this.enlacePublico);
    }
  }

  get whatsappPublico(): string {
    const texto = `Hola, para completar tu pago acepta nuestros términos y condiciones aquí: ${this.enlacePublico}`;
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  async copiar(a: any): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.enlace(a));
      this.swal.success('Enlace copiado');
    } catch {
      this.swal.warning(this.enlace(a));
    }
  }

  // wa.me al número del cliente con el enlace listo; sin número, WhatsApp deja elegir el chat
  whatsapp(a: any): string {
    const numero = String(a.telefonoEnvio || '').replace(/\D/g, '');
    const conLada = numero.length === 10 ? `52${numero}` : numero;
    const texto = `Hola, para completar tu pago (${a.concepto}) acepta nuestros términos y condiciones aquí: ${this.enlace(a)}`;
    return `https://wa.me/${conLada}?text=${encodeURIComponent(texto)}`;
  }

  borrar(a: any): void {
    this.aceptaciones.eliminar(a._id).subscribe({
      next: () => {
        if (this.nuevo?._id === a._id) this.nuevo = null;
        this.cargar();
      },
      error: (err) => this.swal.error(err?.error?.message || 'No pudimos borrar el enlace.')
    });
  }

  // Busca por número (con o sin lada/espacios), concepto o quién lo creó
  get filtrados(): any[] {
    const texto = this.normalizar(this.busqueda);
    if (!texto) return this.lista;
    const digitos = texto.replace(/\D/g, '');
    return this.lista.filter(a =>
      (digitos.length >= 3 && [a.telefono, a.telefonoEnvio].some(t => String(t || '').includes(digitos))) ||
      [a.concepto, a.metodoPago, a.creadoPorNombre].some(c => this.normalizar(c).includes(texto))
    );
  }

  get aceptadas(): number {
    return this.filtrados.filter(a => a.estado === 'aceptado').length;
  }

  private normalizar(texto: string): string {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
}
