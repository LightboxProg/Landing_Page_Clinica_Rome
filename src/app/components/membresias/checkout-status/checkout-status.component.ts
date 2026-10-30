import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingService } from '../../../services/booking/booking.service';
import { MembresiasService } from '../../../services/membresias/membresias.service';
import { PromocionesService } from '../../../services/promociones/promociones.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-checkout-status',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-status.component.html',
  styleUrl: './checkout-status.component.css'
})
export class CheckoutStatusComponent implements OnInit {
  status: 'success' | 'canceled' | 'loading' = 'loading';
  sessionId: string | null = null;
  type: string | null = null;
  // Arranque: las sesiones de membresía se agendan con recepción, no en línea
  readonly soloPromos = environment.agendaSoloPromos;

  // Membresía: no se dice "activa" hasta que el backend confirma el pago con Stripe
  membresia: any = null;
  verificandoMembresia = false;
  membresiaSinConfirmar = false;
  // Link de recepción sin enganche: sólo se registró la tarjeta
  soloTarjeta = false;
  private intentos = 0;

  // Cita pagada en la web: día, hora y montos que confirma el backend
  cita: any = null;
  verificandoCita = false;

  // Pago rápido de promoción: número que pagó y el WhatsApp a donde se le manda
  promo: any = null;
  verificandoPromo = false;
  promoSinConfirmar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private membresiasService: MembresiasService,
    private promosService: PromocionesService
  ) {}

  // Determina el estado del pago y el tipo a partir de la url y query params
  ngOnInit(): void {
    const url = this.router.url;
    this.type = this.route.snapshot.queryParamMap.get('type');
    this.soloTarjeta = this.route.snapshot.queryParamMap.get('solo_tarjeta') === '1';
    
    if (url.includes('success')) {
      this.status = 'success';
      this.sessionId = this.route.snapshot.queryParamMap.get('session_id');
      if (this.type === 'cita' && this.sessionId) {
        this.verificandoCita = true;
        this.bookingService.verificarCitaCheckoutSession(this.sessionId).subscribe({
          next: (res: any) => {
            this.cita = res?.cita || null;
            this.verificandoCita = false;
          },
          error: (err) => {
            console.error('Error al verificar cita tras pago', err);
            this.verificandoCita = false;
          }
        });
      } else if (this.type === 'promo' && this.sessionId) {
        this.verificarPromo();
      } else if (this.type !== 'cita' && this.sessionId) {
        this.verificarMembresia();
      }
    } else if (url.includes('cancel')) {
      this.status = 'canceled';
    } else {
      this.volver();
    }
  }

  // La clínica está en Ciudad de México; se muestra su hora, no la del navegador
  fechaCita(fecha: string): string {
    const texto = new Date(fecha).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  horaCita(fecha: string): string {
    return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Mexico_City' });
  }

  verificarMembresia(): void {
    if (!this.sessionId) return;
    this.verificandoMembresia = true;
    this.membresiaSinConfirmar = false;
    this.membresiasService.verificarCheckout(this.sessionId).subscribe({
      next: (res) => {
        if (res?.success) {
          this.membresia = res.membresia;
          this.verificandoMembresia = false;
        } else if (++this.intentos < 4) {
          // Stripe puede tardar unos segundos en marcar el pago
          setTimeout(() => this.verificarMembresia(), 2500);
        } else {
          this.verificandoMembresia = false;
          this.membresiaSinConfirmar = true;
        }
      },
      error: () => {
        this.verificandoMembresia = false;
        this.membresiaSinConfirmar = true;
      }
    });
  }

  verificarPromo(): void {
    if (!this.sessionId) return;
    this.verificandoPromo = true;
    this.promoSinConfirmar = false;
    this.promosService.verificarPagoPromo(this.sessionId).subscribe({
      next: (res) => {
        this.promo = res;
        this.verificandoPromo = false;
        // Ya pagó: se le manda al WhatsApp de la clínica para agendar
        if (res?.whatsappUrl) setTimeout(() => (window.location.href = res.whatsappUrl), 4000);
      },
      error: () => {
        if (++this.intentos < 4) {
          // Stripe puede tardar unos segundos en marcar el pago
          setTimeout(() => this.verificarPromo(), 2500);
        } else {
          this.verificandoPromo = false;
          this.promoSinConfirmar = true;
        }
      }
    });
  }

  // Redirecciona al catalogo o al agendador segun corresponda
  volver(): void {
    const defaultRedirect = this.type === 'cita' ? '/agendar-cita' : this.type === 'promo' ? '/promociones' : '/membresias';
    this.router.navigate([defaultRedirect]);
  }
}
