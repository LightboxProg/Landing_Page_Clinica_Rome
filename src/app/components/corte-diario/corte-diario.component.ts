import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../services/citas/citas.service';
import { SwalService } from '../../services/swal/swal.service';

@Component({
  selector: 'app-corte-diario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './corte-diario.component.html',
  styleUrl: './corte-diario.component.css'
})
export class CorteDiarioComponent implements OnInit {
  fechaSeleccionada: string = new Date().toISOString().split('T')[0];
  corteActivo: 'dental' | 'estetica' = 'dental';
  corteData: any = null;
  cargando = false;

  totalesDental = { efectivo: 0, tarjeta: 0, transferencia: 0, stripe: 0, descuentos: 0, granTotal: 0 };
  totalesEstetica = { efectivo: 0, tarjeta: 0, transferencia: 0, stripe: 0, descuentos: 0, granTotal: 0 };
  citasDental: any[] = [];
  citasEstetica: any[] = [];

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
    
    this.totalesDental = { efectivo: 0, tarjeta: 0, transferencia: 0, stripe: 0, descuentos: 0, granTotal: 0 };
    this.totalesEstetica = { efectivo: 0, tarjeta: 0, transferencia: 0, stripe: 0, descuentos: 0, granTotal: 0 };

    citas.forEach(cita => {
      const cobradoClinica = cita.cobradoClinicaHoy || 0;
      if (cita.tipoCita === 'Dental') {
        this.citasDental.push(cita);
        if (cita.metodoPago === 'Efectivo') this.totalesDental.efectivo += cobradoClinica;
        else if (cita.metodoPago === 'Tarjeta') this.totalesDental.tarjeta += cobradoClinica;
        else if (cita.metodoPago === 'Transferencia') this.totalesDental.transferencia += cobradoClinica;
        
        this.totalesDental.stripe += cita.anticipoStripeHoy || 0;
        this.totalesDental.descuentos += cita.descuentoMonto || 0;
        this.totalesDental.granTotal = this.totalesDental.efectivo + this.totalesDental.tarjeta + this.totalesDental.transferencia + this.totalesDental.stripe;
      } else {
        this.citasEstetica.push(cita);
        if (cita.metodoPago === 'Efectivo') this.totalesEstetica.efectivo += cobradoClinica;
        else if (cita.metodoPago === 'Tarjeta') this.totalesEstetica.tarjeta += cobradoClinica;
        else if (cita.metodoPago === 'Transferencia') this.totalesEstetica.transferencia += cobradoClinica;

        this.totalesEstetica.stripe += cita.anticipoStripeHoy || 0;
        this.totalesEstetica.descuentos += cita.descuentoMonto || 0;
        this.totalesEstetica.granTotal = this.totalesEstetica.efectivo + this.totalesEstetica.tarjeta + this.totalesEstetica.transferencia + this.totalesEstetica.stripe;
      }
    });
  }

  // Abre el dialogo de impresion del navegador
  imprimirCorte(): void {
    window.print();
  }
}
