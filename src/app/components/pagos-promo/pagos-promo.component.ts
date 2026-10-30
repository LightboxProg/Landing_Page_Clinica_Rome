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

  get total(): number {
    return this.pagos.filter(p => p.estado === 'pagado').reduce((suma, p) => suma + (p.monto || 0), 0);
  }

  whatsapp(pago: any): string {
    return `https://wa.me/${pago.telefono}`;
  }
}
