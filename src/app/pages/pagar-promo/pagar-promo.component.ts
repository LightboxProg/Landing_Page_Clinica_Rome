import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PromocionesService } from '../../services/promociones/promociones.service';
import { APARIENCIA_PAGO } from '../agendar-cita/agendar-cita.component';

// Ladas más comunes entre los pacientes; "Otra" deja escribirla
const LADAS = [
  { lada: '52', pais: 'México' },
  { lada: '1', pais: 'EE. UU. / Canadá' },
  { lada: '34', pais: 'España' },
  { lada: '57', pais: 'Colombia' },
  { lada: '502', pais: 'Guatemala' },
  { lada: '503', pais: 'El Salvador' },
  { lada: '504', pais: 'Honduras' },
  { lada: '506', pais: 'Costa Rica' },
  { lada: '51', pais: 'Perú' },
  { lada: '54', pais: 'Argentina' },
  { lada: '56', pais: 'Chile' },
  { lada: '58', pais: 'Venezuela' }
];

type Paso = 'numero' | 'confirmar' | 'pago';

// Pago rápido de una promoción: número con lada → confirmar número → términos y
// tarjeta dentro de la página → WhatsApp. Sin horario ni expediente; la clínica
// agenda después por WhatsApp.
@Component({
  selector: 'app-pagar-promo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './pagar-promo.component.html',
  styleUrl: './pagar-promo.component.css'
})
export class PagarPromoComponent implements OnInit, OnDestroy {
  readonly ladas = LADAS;

  promo: any = null;
  item: any = null;
  cargando = true;
  noDisponible = false;

  paso: Paso = 'numero';
  lada = '52';
  ladaOtra = '';
  telefono = '';

  // Pago: la sesión se crea al aceptar términos y Stripe monta la tarjeta en #pago-stripe
  aceptaTerminos = false;
  correo = '';
  pagoCargando = false;
  pagoListo = false;
  pagando = false;
  pagoError = '';
  urlPago = '';
  private checkoutStripe: any = null;
  private accionesPago: any = null;

  constructor(
    private route: ActivatedRoute,
    private promosService: PromocionesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const promocionId = this.route.snapshot.queryParamMap.get('promo');
    const itemId = this.route.snapshot.queryParamMap.get('item');
    this.promosService.obtenerPromocionesActivas().subscribe({
      next: (promos) => {
        this.promo = (promos || []).find(p => p._id === promocionId) || null;
        this.item = this.promo?.items?.find((i: any) => i._id === itemId && (i.tipo === 'Servicio' || i.tipo === 'Paquete')) || null;
        this.noDisponible = !this.item;
        this.cargando = false;
      },
      error: () => {
        this.noDisponible = true;
        this.cargando = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.cerrarPago();
  }

  // ---------- Número ----------

  get ladaFinal(): string {
    return this.lada === 'otra' ? this.ladaOtra : this.lada;
  }

  // México siempre son 10 dígitos; otros países varían
  get telefonoValido(): boolean {
    const lada = this.ladaFinal;
    if (!/^\d{1,4}$/.test(lada)) return false;
    return lada === '52' ? this.telefono.length === 10 : this.telefono.length >= 6 && this.telefono.length <= 12;
  }

  // "+52 449 123 4567" para que la persona revise su número
  get telefonoLegible(): string {
    const t = this.telefono;
    const agrupado = t.length === 10 ? `${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6)}` : t;
    return `+${this.ladaFinal} ${agrupado}`;
  }

  limpiarTelefono(): void {
    this.telefono = (this.telefono || '').replace(/\D/g, '').slice(0, 12);
  }

  limpiarLada(): void {
    this.ladaOtra = (this.ladaOtra || '').replace(/\D/g, '').slice(0, 4);
  }

  continuar(): void {
    if (this.telefonoValido) this.paso = 'confirmar';
  }

  confirmarNumero(): void {
    this.paso = 'pago';
  }

  cambiarNumero(): void {
    this.cerrarPago();
    this.aceptaTerminos = false;
    this.paso = 'numero';
  }

  // ---------- Montos ----------

  get precio(): number {
    return Number(this.item?.precioFinal) || 0;
  }

  // Lo que se cobra ahora según la promoción: completo o anticipo (topado al precio)
  get montoAhora(): number {
    const pago = this.promo?.pago;
    const anticipo = Number(pago?.anticipo) || 0;
    return pago?.tipo === 'Anticipo' && anticipo > 0 ? Math.min(anticipo, this.precio) : this.precio;
  }

  get restante(): number {
    return Math.max(0, this.precio - this.montoAhora);
  }

  // ---------- Pago ----------

  get correoValido(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo.trim());
  }

  get puedePagar(): boolean {
    if (!this.aceptaTerminos || this.pagando || this.pagoCargando) return false;
    if (this.urlPago) return true;
    return this.pagoListo && this.correoValido;
  }

  // Al marcar la casilla por primera vez se crea el cobro y aparece el formulario de tarjeta
  alCambiarTerminos(): void {
    if (this.aceptaTerminos && !this.pagoListo && !this.urlPago && !this.pagoCargando) this.prepararPago();
  }

  private prepararPago(): void {
    this.cerrarPago();
    this.pagoCargando = true;
    this.promosService.crearPagoPromo({
      promocionId: this.promo._id,
      itemId: this.item._id,
      lada: this.ladaFinal,
      telefono: this.telefono,
      aceptaTerminos: this.aceptaTerminos
    }).subscribe({
      next: async (res) => {
        if (!res.clientSecret) {
          this.urlPago = res.url || '';
          this.pagoCargando = false;
          return;
        }
        try {
          await this.montarPago(res.publishableKey!, res.clientSecret);
          this.pagoListo = true;
        } catch (e) {
          console.error('No se pudo cargar el formulario de pago', e);
          this.pagoError = 'No se pudo cargar el formulario de pago. Recarga la página o intenta más tarde.';
        }
        this.pagoCargando = false;
      },
      error: (err) => {
        this.pagoCargando = false;
        this.aceptaTerminos = false;
        this.pagoError = err?.error?.message || 'Ocurrió un error al iniciar el pago. Intenta de nuevo.';
      }
    });
  }

  private async montarPago(publishableKey: string, clientSecret: string): Promise<void> {
    // Se carga aparte para no sumar Stripe al bundle inicial
    const { loadStripe } = await import('@stripe/stripe-js');
    const stripe = await loadStripe(publishableKey, { locale: 'es-419' });
    if (!stripe) throw new Error('Stripe.js no cargó');

    this.checkoutStripe = stripe.initCheckoutElementsSdk({
      clientSecret,
      elementsOptions: {
        fonts: [{ cssSrc: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap' }],
        appearance: APARIENCIA_PAGO
      }
    });
    const resultado = await this.checkoutStripe.loadActions();
    if (resultado.type !== 'success') throw new Error(resultado.error?.message || 'loadActions');
    this.accionesPago = resultado.actions;

    this.cdr.detectChanges();
    const elemento = this.checkoutStripe.createPaymentElement({ layout: 'tabs' });
    elemento.mount('#pago-stripe');
  }

  private cerrarPago(): void {
    try { this.checkoutStripe?.getPaymentElement()?.destroy(); } catch { /* ya se había desmontado */ }
    this.checkoutStripe = null;
    this.accionesPago = null;
    this.pagoListo = false;
    this.pagoError = '';
    this.urlPago = '';
  }

  async pagar(): Promise<void> {
    if (!this.puedePagar) return;
    if (this.urlPago) {
      window.location.href = this.urlPago;
      return;
    }
    this.pagando = true;
    this.pagoError = '';
    // Si sale bien, Stripe lleva a la confirmación y de ahí a WhatsApp
    const resultado = await this.accionesPago.confirm({ email: this.correo.trim() });
    if (resultado.type === 'error') {
      this.pagoError = resultado.error?.message || 'No se pudo completar el pago. Revisa los datos de tu tarjeta.';
      this.pagando = false;
    }
  }
}
