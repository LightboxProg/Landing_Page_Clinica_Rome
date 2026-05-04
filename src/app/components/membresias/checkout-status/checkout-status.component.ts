import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

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

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    // Revisar si viene de /success o de /cancel según la ruta o parámetros
    const url = this.router.url;
    
    if (url.includes('success')) {
      this.status = 'success';
      this.sessionId = this.route.snapshot.queryParamMap.get('session_id');
    } else if (url.includes('cancel')) {
      this.status = 'canceled';
    } else {
      // Por si entra directo sin path correcto
      this.router.navigate(['/membresias']);
    }
  }

  volver(): void {
    this.router.navigate(['/membresias']);
  }
}
