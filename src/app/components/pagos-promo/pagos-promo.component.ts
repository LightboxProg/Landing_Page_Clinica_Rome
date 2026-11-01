import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromocionesService } from '../../services/promociones/promociones.service';

// Pagos rápidos de promociones hechos en la landing: quién pagó (su número),
// qué compró y cuánto. La clínica le escribe por WhatsApp para agendar.
@Component({
  selector: 'app-pagos-promo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagos-promo.component.html',
  styleUrl: './pagos-promo.component.css'
})
export class PagosPromoComponent implements OnInit {
  pagos: any[] = [];
  cargando = false;
  error = '';

  desde = '';
  hasta = '';
  estado = 'pagado';
  busqueda = '';

  constructor(private promosService: PromocionesService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    this.promosService.listarPagosPromo({
      desde: this.desde ? `${this.desde}T00:00:00-06:00` : '',
      hasta: this.hasta ? `${this.hasta}T23:59:59-06:00` : '',
      estado: this.estado
    }).subscribe({
      next: (pagos) => {
        this.pagos = pagos || [];
        this.cargando = false;
      },
      error: () => {
        this.error = 'No pudimos cargar los pagos.';
        this.cargando = false;
      }
    });
  }

  // Busca por número (con o sin lada/espacios), promoción, tratamiento o folio
  get filtrados(): any[] {
    const texto = this.normalizar(this.busqueda);
    if (!texto) return this.pagos;
    const digitos = texto.replace(/\D/g, '');
    return this.pagos.filter(p =>
      (digitos.length >= 3 && String(p.telefono || '').includes(digitos)) ||
      [p.promocionNombre, p.itemNombre, p.folio].some(campo => this.normalizar(campo).includes(texto))
    );
  }

  private get pagados(): any[] {
    return this.filtrados.filter(p => p.estado === 'pagado');
  }

  get total(): number {
    return this.pagados.reduce((suma, p) => suma + (p.monto || 0), 0);
  }

  get totalComision(): number {
    return this.pagados.reduce((suma, p) => suma + (p.stripe?.comision || 0), 0);
  }

  // Lo que deposita Stripe (los pagos sin dato todavía cuentan por su monto completo)
  get totalNeto(): number {
    return this.pagados.reduce((suma, p) => suma + (p.stripe?.neto ?? p.monto ?? 0), 0);
  }

  get sinDato(): number {
    return this.pagados.filter(p => p.stripe?.neto == null).length;
  }

  private normalizar(texto: string): string {
    return String(texto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  whatsapp(pago: any): string {
    return `https://wa.me/${pago.telefono}`;
  }
}
