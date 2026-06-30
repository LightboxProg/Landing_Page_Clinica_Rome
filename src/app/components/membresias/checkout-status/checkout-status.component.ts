import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../../services/booking/booking.service';

@Component({
  selector: 'app-checkout-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-status.component.html',
  styleUrl: './checkout-status.component.css'
})
export class CheckoutStatusComponent implements OnInit {
  status: 'success' | 'canceled' | 'loading' = 'loading';
  sessionId: string | null = null;
  type: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService
  ) {}

  // Determina el estado del pago y el tipo a partir de la url y query params
  ngOnInit(): void {
    const url = this.router.url;
    this.type = this.route.snapshot.queryParamMap.get('type');
    
    if (url.includes('success')) {
      this.status = 'success';
      this.sessionId = this.route.snapshot.queryParamMap.get('session_id');
      if (this.type === 'cita' && this.sessionId) {
        this.bookingService.verificarCitaCheckoutSession(this.sessionId).subscribe({
          next: () => console.log('Cita verificada y sincronizada'),
          error: (err) => console.error('Error al verificar cita tras pago', err)
        });
      }
    } else if (url.includes('cancel')) {
      this.status = 'canceled';
    } else {
      const defaultRedirect = this.type === 'cita' ? '/agendar-cita' : '/membresias';
      this.router.navigate([defaultRedirect]);
    }
  }

  // Redirecciona al catalogo o al agendador segun corresponda
  volver(): void {
    const defaultRedirect = this.type === 'cita' ? '/agendar-cita' : '/membresias';
    this.router.navigate([defaultRedirect]);
  }
}
