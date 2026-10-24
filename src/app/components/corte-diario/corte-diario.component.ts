import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../services/citas/citas.service';
import { SwalService } from '../../services/swal/swal.service';

// stripeComision / stripeNeto: lo que Stripe se queda y lo que deposita de los anticipos en línea.
// stripeSinDato: pagos de Stripe cuya comisión todavía no se conoce (membresías, pagos viejos).
// stripeDisputas: anticipos que Stripe retiró porque el paciente los desconoció con su banco.
// descuentos: los que dio caja; promociones: lo que se dejó de cobrar por precio de promo.
// Los dos cuentan el día en que se cobra la cita, no el día del anticipo.
const TOTALES_VACIOS = { efectivo: 0, tarjeta: 0, transferencia: 0, stripe: 0, stripeComision: 0, stripeNeto: 0, stripeSinDato: 0, stripeDisputas: 0, descuentos: 0, promociones: 0, granTotal: 0 };

@Component({
  selector: 'app-corte-diario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './corte-diario.component.html',
  styleUrl: './corte-diario.component.css'
})
export class CorteDiarioComponent implements OnInit {
  // Día de la clínica, no el de UTC: con toISOString después de las 6 p.m. se abría el corte de mañana
  fechaSeleccionada: string = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  corteActivo: 'dental' | 'estetica' = 'dental';
  corteData: any = null;
  cargando = false;

  totalesDental = { ...TOTALES_VACIOS };
  totalesEstetica = { ...TOTALES_VACIOS };
  citasDental: any[] = [];
  citasEstetica: any[] = [];
  pagosMembresia: any[] = [];

  constructor(
    private citasService: CitasService,
    private swal: SwalService
  ) {}

  ngOnInit(): void {
    this.cargarCorte();
  }

  // Obtiene el desglose financiero del dia desde el backend y procesa los cortes separados
  cargarCorte(): void {
    this.cargando = true;
    this.citasService.obtenerCorteDiario(this.fechaSeleccionada).subscribe({
      next: (data: any) => {
        this.corteData = data;
        this.procesarCortesSeparados(data.citas);
        this.sumarMembresias(data.pagosMembresia || []);
        this.cargando = false;
      },
      error: (err: any) => {
        this.cargando = false;
        this.swal.error('Error al cargar el corte de caja');
        console.error(err);
      }
    });
  }

  // Clasifica los cobros y totales de las citas del dia en el area dental o estetica
  procesarCortesSeparados(citas: any[]): void {
    this.citasDental = [];
    this.citasEstetica = [];
    
    this.totalesDental = { ...TOTALES_VACIOS };
    this.totalesEstetica = { ...TOTALES_VACIOS };

    citas.forEach(cita => {
      const cobradoClinica = cita.cobradoClinicaHoy || 0;
      // Anticipo recibido hoy en mostrador: el backend ya lo suma, aquí también tiene que contar
      const anticipoClinica = cita.anticipoClinicaHoy || 0;
      if (cita.tipoCita === 'Dental') {
        this.citasDental.push(cita);
        if (cita.metodoPago === 'Efectivo') this.totalesDental.efectivo += cobradoClinica;
        else if (cita.metodoPago === 'Tarjeta') this.totalesDental.tarjeta += cobradoClinica;
        else if (cita.metodoPago === 'Transferencia') this.totalesDental.transferencia += cobradoClinica;
        if (cita.anticipoMetodoPago === 'Efectivo') this.totalesDental.efectivo += anticipoClinica;
        else if (cita.anticipoMetodoPago === 'Tarjeta') this.totalesDental.tarjeta += anticipoClinica;
        else if (cita.anticipoMetodoPago === 'Transferencia') this.totalesDental.transferencia += anticipoClinica;
        
        this.sumarStripe(this.totalesDental, cita);
        this.totalesDental.descuentos += cita.descuentoHoy || 0;
        this.totalesDental.promociones += cita.promocionHoy || 0;
        this.totalesDental.granTotal = this.totalesDental.efectivo + this.totalesDental.tarjeta + this.totalesDental.transferencia + this.totalesDental.stripe;
      } else {
        this.citasEstetica.push(cita);
        if (cita.metodoPago === 'Efectivo') this.totalesEstetica.efectivo += cobradoClinica;
        else if (cita.metodoPago === 'Tarjeta') this.totalesEstetica.tarjeta += cobradoClinica;
        else if (cita.metodoPago === 'Transferencia') this.totalesEstetica.transferencia += cobradoClinica;
        if (cita.anticipoMetodoPago === 'Efectivo') this.totalesEstetica.efectivo += anticipoClinica;
        else if (cita.anticipoMetodoPago === 'Tarjeta') this.totalesEstetica.tarjeta += anticipoClinica;
        else if (cita.anticipoMetodoPago === 'Transferencia') this.totalesEstetica.transferencia += anticipoClinica;

        this.sumarStripe(this.totalesEstetica, cita);
        this.totalesEstetica.descuentos += cita.descuentoHoy || 0;
        this.totalesEstetica.promociones += cita.promocionHoy || 0;
        this.totalesEstetica.granTotal = this.totalesEstetica.efectivo + this.totalesEstetica.tarjeta + this.totalesEstetica.transferencia + this.totalesEstetica.stripe;
      }
    });
  }

  private sumarStripe(t: typeof TOTALES_VACIOS, cita: any): void {
    t.stripeDisputas += cita.stripeDisputaHoy || 0;
    const anticipo = cita.anticipoStripeHoy || 0;
    if (!anticipo) return;
    t.stripe += anticipo;
    if (cita.stripeNeto != null) {
      t.stripeComision += cita.stripeComision || 0;
      t.stripeNeto += cita.stripeNeto;
    } else {
      t.stripeSinDato += 1;
    }
  }

  // Estado de la disputa en palabras de recepción
  textoDisputa(estado: string): string {
    if (estado === 'won') return 'Disputa ganada';
    if (estado === 'lost') return 'Disputa perdida: anticipo devuelto al paciente';
    return 'En disputa con el banco';
  }

  // Fecha corta para el depósito: "31 oct"
  diaCorto(fecha: string | null): string {
    return fecha ? new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
  }

  // Enganches y parcialidades de membresías: son tratamientos estéticos
  sumarMembresias(pagos: any[]): void {
    this.pagosMembresia = pagos;
    const t = this.totalesEstetica;
    pagos.forEach(p => {
      if (p.metodoPago === 'Efectivo') t.efectivo += p.monto;
      else if (p.metodoPago === 'Tarjeta') t.tarjeta += p.monto;
      else if (p.metodoPago === 'Transferencia') t.transferencia += p.monto;
      else if (p.metodoPago === 'Stripe') { t.stripe += p.monto; t.stripeSinDato += 1; }
    });
    t.granTotal = t.efectivo + t.tarjeta + t.transferencia + t.stripe;
  }

  // Abre el dialogo de impresion del navegador
  imprimirCorte(): void {
    window.print();
  }
}
