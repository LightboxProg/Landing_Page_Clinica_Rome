import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BookingService } from '../../../services/booking/booking.service';
import { MembresiasService } from '../../../services/membresias/membresias.service';

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

  // Membresía: no se dice "activa" hasta que el backend confirma el pago con Stripe
  membresia: any = null;
  verificandoMembresia = false;
  membresiaSinConfirmar = false;
  // Link de recepción sin enganche: sólo se registró la tarjeta
  soloTarjeta = false;
  private intentos = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private membresiasService: MembresiasService
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
        this.bookingService.verificarCitaCheckoutSession(this.sessionId).subscribe({
          next: () => console.log('Cita verificada y sincronizada'),
          error: (err) => console.error('Error al verificar cita tras pago', err)
        });
      } else if (this.type !== 'cita' && this.sessionId) {
        this.verificarMembresia();
      }
    } else if (url.includes('cancel')) {
      this.status = 'canceled';
    } else {
      const defaultRedirect = this.type === 'cita' ? '/agendar-cita' : '/membresias';
      this.router.navigate([defaultRedirect]);
    }
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

  // Redirecciona al catalogo o al agendador segun corresponda
  volver(): void {
    const defaultRedirect = this.type === 'cita' ? '/agendar-cita' : '/membresias';
    this.router.navigate([defaultRedirect]);
  }
}
