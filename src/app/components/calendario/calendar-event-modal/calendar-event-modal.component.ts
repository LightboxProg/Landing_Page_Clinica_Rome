import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CitasService } from '../../../services/citas/citas.service';
import { AuthService } from '../../../services/auth/auth.service';
import { SwalService } from '../../../services/swal/swal.service';
import { PromocionesService } from '../../../services/promociones/promociones.service';

@Component({
  selector: 'app-calendar-event-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen" class="event-modal-overlay" (click)="closeModal()">
      <div class="event-modal-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div>
            <h3>{{ event?.pacienteNombre }}</h3>
            <span class="badge-tipo" *ngIf="event?.tipoCita" [ngClass]="event.tipoCita === 'Dental' ? 'dental' : 'estetica'">
              {{ event.tipoCita }}
            </span>
          </div>
          <button class="close-btn" (click)="closeModal()">
            <i class="fas fa-times"></i>
          </button>
        </header>
        
        <div class="modal-content">
          <!-- Contexto de la cita: se lee de corrido, sin adornos -->
          <dl class="ficha">
            <div class="ficha__row">
              <dt>Atiende</dt>
              <dd>{{ event?.medicoNombre }}</dd>
            </div>
            <div class="ficha__row">
              <dt>Tratamiento</dt>
              <dd>{{ event?.servicioNombre }}</dd>
            </div>
            <div class="ficha__row" *ngIf="event?.pacienteTelefono">
              <dt>Teléfono</dt>
              <dd class="num">{{ event?.pacienteTelefono }}</dd>
            </div>
          </dl>

          <div *ngIf="event?.description" class="notas">
            <span class="notas__k">Notas</span>
            <p>{{ event?.description }}</p>
          </div>

          <!-- Cobro -->
          <section class="cobro" *ngIf="event?.citaId">

            <!-- Ya cobrada -->
            <div class="cobro__estado is-pagada" *ngIf="event?.cobrado">
              <p class="sello"><i class="fas fa-check"></i> Cobrada</p>

              <dl class="cuenta">
                <div class="cuenta__row">
                  <dt>Tratamiento</dt>
                  <dd>{{ event.costoTotal | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
                <div class="cuenta__row cuenta__row--menos" *ngIf="event.descuentoMonto > 0">
                  <dt>Descuento</dt>
                  <dd>−{{ event.descuentoMonto | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
                <div class="cuenta__row cuenta__row--menos" *ngIf="event.montoAnticipo > 0">
                  <dt>Anticipo<em *ngIf="event.anticipoMetodoPago && event.anticipoMetodoPago !== 'Ninguno'">{{ event.anticipoMetodoPago }}</em></dt>
                  <dd>−{{ event.montoAnticipo | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
                <div class="cuenta__hero">
                  <dt>Cobrado en clínica<em *ngIf="event.metodoPago && event.metodoPago !== 'Ninguno'">{{ event.metodoPago }}</em></dt>
                  <dd>{{ event.montoPagadoClinica | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
              </dl>
            </div>

            <!-- Pendiente -->
            <div class="cobro__estado" *ngIf="!event?.cobrado && !mostrarPanelCobro">
              <p class="sello is-pendiente"><i class="fas fa-clock"></i> Pendiente de cobro</p>

              <dl class="cuenta" *ngIf="event.montoAnticipo > 0">
                <div class="cuenta__row cuenta__row--menos">
                  <dt>Anticipo recibido<em *ngIf="event.anticipoMetodoPago && event.anticipoMetodoPago !== 'Ninguno'">{{ event.anticipoMetodoPago }}</em></dt>
                  <dd>{{ event.montoAnticipo | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
              </dl>

              <button *ngIf="puedeVender" class="btn btn-cobrar" (click)="abrirPanelCobro()">
                <i class="fas fa-cash-register"></i> Cobrar
              </button>
            </div>

            <!-- Panel interactivo de cobro -->
            <div class="panel-cobro" *ngIf="mostrarPanelCobro && !event?.cobrado">
              <div class="panel-cobro-title">Registrar cobro</div>

              <div class="form-group">
                <label>Costo del tratamiento *</label>
                <input
                  type="number"
                  [(ngModel)]="costoTotal"
                  [placeholder]="cargandoPrecio ? 'Consultando precio…' : 'Costo total de la consulta'"
                  [disabled]="cargandoPrecio"
                  class="form-control"
                  min="0"
                />
                <p class="hint-precio" *ngIf="cargandoPrecio">Consultando el precio de lista…</p>
                <p class="hint-precio hint-precio--warn" *ngIf="avisoPrecio">{{ avisoPrecio }}</p>
                <p class="hint-precio hint-precio--promo" *ngIf="promocionNombreAsociada">
                  Promoción aplicada: {{ promocionNombreAsociada }}
                </p>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Tipo Descuento</label>
                  <select [(ngModel)]="descuentoTipo" class="form-control" (change)="onDescuentoTipoChange()">
                    <option value="Ninguno">Sin descuento</option>
                    <option value="Monto">Monto fijo ($)</option>
                    <option value="Porcentaje">Porcentaje (%)</option>
                  </select>
                </div>
                <div class="form-group" *ngIf="descuentoTipo !== 'Ninguno'">
                  <label>{{ descuentoTipo === 'Porcentaje' ? 'Porcentaje a descontar' : 'Pesos a descontar' }}</label>
                  <input
                    type="number"
                    [(ngModel)]="descuentoValor"
                    class="form-control"
                    min="0"
                    [max]="descuentoTipo === 'Porcentaje' ? 100 : costoTotal"
                    [placeholder]="descuentoTipo === 'Porcentaje' ? 'Ej. 10' : 'Ej. 100'"
                  />
                </div>
              </div>

              <!-- Traducción en vivo: un 10% no dice nada hasta verlo en pesos -->
              <p class="hint-precio hint-precio--promo"
                 *ngIf="descuentoTipo === 'Porcentaje' && descuentoValor > 0 && !descuentoInvalido">
                {{ descuentoValor }}% de {{ costoTotal | currency:'MXN' }} = {{ obtenerDescuentoCalculado() | currency:'MXN' }}
              </p>
              <p class="hint-precio hint-precio--warn" *ngIf="descuentoInvalido">
                {{ mensajeDescuentoInvalido }}
              </p>


              <div class="form-group">
                <label>¿Cómo paga? *</label>
                <div class="metodos" role="radiogroup" aria-label="Método de pago">
                  <button type="button" class="metodo" [class.is-on]="metodoPago === 'Efectivo'"
                          [attr.aria-checked]="metodoPago === 'Efectivo'" role="radio"
                          (click)="metodoPago = 'Efectivo'">
                    <i class="fas fa-money-bill-wave"></i> Efectivo
                  </button>
                  <button type="button" class="metodo" [class.is-on]="metodoPago === 'Tarjeta'"
                          [attr.aria-checked]="metodoPago === 'Tarjeta'" role="radio"
                          (click)="metodoPago = 'Tarjeta'">
                    <i class="fas fa-credit-card"></i> Tarjeta
                  </button>
                  <button type="button" class="metodo" [class.is-on]="metodoPago === 'Transferencia'"
                          [attr.aria-checked]="metodoPago === 'Transferencia'" role="radio"
                          (click)="metodoPago = 'Transferencia'">
                    <i class="fas fa-building-columns"></i> Transferencia
                  </button>
                </div>
              </div>

              <!-- La cuenta. Se lee como un recibo: los descuentos restan
                   visiblemente y abajo queda el número que se cobra. -->
              <dl class="cuenta cuenta--viva">
                <div class="cuenta__row">
                  <dt>Tratamiento</dt>
                  <dd>{{ costoTotal | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
                <div class="cuenta__row cuenta__row--menos"
                     *ngIf="descuentoTipo !== 'Ninguno' && descuentoValor > 0 && !descuentoInvalido">
                  <dt>Descuento<em *ngIf="descuentoTipo === 'Porcentaje'">{{ descuentoValor }}%</em></dt>
                  <dd>−{{ obtenerDescuentoCalculado() | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
                <div class="cuenta__row cuenta__row--sub"
                     *ngIf="descuentoTipo !== 'Ninguno' && descuentoValor > 0 && !descuentoInvalido">
                  <dt>Subtotal</dt>
                  <dd>{{ costoTotal - obtenerDescuentoCalculado() | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
                <div class="cuenta__row cuenta__row--menos" *ngIf="event.montoAnticipo > 0">
                  <dt>Anticipo<em *ngIf="event.anticipoMetodoPago && event.anticipoMetodoPago !== 'Ninguno'">{{ event.anticipoMetodoPago }}</em></dt>
                  <dd>−{{ event.montoAnticipo | currency:'MXN':'symbol-narrow':'1.0-0' }}</dd>
                </div>
              </dl>

              <!-- El importe y el acto de cobrarlo no se separan: los dos
                   quedan anclados y siempre a la vista. -->
              <div class="cierre">
                <div class="cierre__total">
                  <span>A cobrar ahora</span>
                  <strong>{{ obtenerTotalNetoACobrar() | currency:'MXN':'symbol-narrow':'1.0-0' }}</strong>
                </div>
                <div class="cierre__acciones">
                  <button type="button" class="btn btn-cancelar" (click)="mostrarPanelCobro = false">Cancelar</button>
                  <button
                    type="button"
                    class="btn btn-confirmar"
                    [disabled]="costoTotal <= 0 || guardandoCobro || descuentoInvalido"
                    (click)="guardarCobro()">
                    {{ guardandoCobro ? 'Guardando…' : 'Confirmar cobro' }}
                  </button>
                </div>
              </div>
            </div>

          </section>
        </div>

        <footer class="modal-footer" *ngIf="!mostrarPanelCobro">
          <button *ngIf="event?.pacienteTelefono" class="action-btn wapp-btn" (click)="onOpenWhatsApp()">
            <i class="fab fa-whatsapp"></i> WhatsApp
          </button>
          <button class="action-btn calendar-btn" (click)="onOpenGoogleCalendar()">
            <i class="fab fa-google"></i> Google Calendar
          </button>
        </footer>
      </div>
    </div>
  `,
  styleUrl: './calendar-event-modal.component.css'
})
export class CalendarEventModalComponent implements OnChanges {
  @Input() isOpen: boolean = false;
  @Input() event: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() cobroRegistrado = new EventEmitter<void>();

  puedeVender = false;
  mostrarPanelCobro = false;
  guardandoCobro = false;
  cargandoPrecio = false;
  avisoPrecio: string | null = null;

  // Campos de cobro
  costoTotal: number = 0;
  descuentoTipo: 'Ninguno' | 'Porcentaje' | 'Monto' = 'Ninguno';
  descuentoValor: number = 0;
  metodoPago: 'Efectivo' | 'Tarjeta' | 'Transferencia' = 'Efectivo';
  promocionIdAsociada: string | null = null;
  promocionNombreAsociada: string | null = null;

  constructor(
    private citasService: CitasService,
    private authService: AuthService,
    private swal: SwalService,
    private promosService: PromocionesService
  ) {
    const user = this.authService.getUsuario();
    this.puedeVender = user?.tipo === 'Administrador' || user?.tipo === 'Recepcionista';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.mostrarPanelCobro = false;
      this.descuentoTipo = 'Ninguno';
      this.descuentoValor = 0;
      this.metodoPago = 'Efectivo';
      this.promocionIdAsociada = null;
      this.promocionNombreAsociada = null;
      this.cargandoPrecio = false;
      this.avisoPrecio = null;

      if (this.event) {
        // Inicializar costo sugerido
        this.costoTotal = this.event.costoTotal || 0;

        // Las citas del bot o de la web con promoción ya traen el descuento
        // calculado al apartar: se respeta el precio que se le prometió.
        if (!this.event.cobrado && this.event.promocionId) {
          this.promocionIdAsociada = this.event.promocionId;
          this.promocionNombreAsociada = this.event.promocionNombre || 'Promoción';
          if (this.event.descuentoTipo && this.event.descuentoTipo !== 'Ninguno') {
            this.descuentoTipo = this.event.descuentoTipo;
            this.descuentoValor = this.event.descuentoValor || 0;
          }
        }
      }
    }
  }

  closeModal() {
    this.close.emit();
  }

  abrirPanelCobro() {
    this.mostrarPanelCobro = true;
    this.avisoPrecio = null;

    // La cita ya trae su promoción (se fijó al apartar): ésa manda.
    if (this.promocionIdAsociada) return;

    if (!this.event?.servicioId) {
      if (this.costoTotal > 0) return;
      this.avisoPrecio = 'Esta cita no tiene un tratamiento ligado, así que no hay precio de lista. Captura el total.';
      return;
    }

    // Se consulta el precio de lista y la mejor promoción vigente para este
    // paciente. La promo entra como descuento (no como costo rebajado) para
    // que el corte diario la cuente en "descuentos".
    this.cargandoPrecio = true;
    this.promosService.obtenerPrecioSugerido(this.event.servicioId, this.event.tipoCita, this.event.pacienteId || undefined).subscribe({
      next: (res) => {
        this.cargandoPrecio = false;
        if (!this.costoTotal) this.costoTotal = res.costoOriginal ?? 0;

        // Sólo si la cita está a precio de lista y no le capturaron otro descuento
        const aPrecioDeLista = this.costoTotal === res.costoOriginal;
        if (res.promocionId && aPrecioDeLista && this.descuentoTipo === 'Ninguno') {
          this.promocionIdAsociada = res.promocionId;
          this.promocionNombreAsociada = res.promocionNombre;
          this.descuentoTipo = 'Monto';
          this.descuentoValor = res.descuentoAplicado;
          this.swal.toast(`Promoción "${res.promocionNombre}" aplicada: ${res.etiqueta || 'descuento'}.`);
        }
        if (!this.costoTotal) {
          this.avisoPrecio = 'El tratamiento no tiene precio registrado. Captura el total.';
        }
      },
      error: () => {
        // Nunca inventamos una cifra: es dinero. Se avisa y se captura.
        this.cargandoPrecio = false;
        this.avisoPrecio = 'No pudimos obtener el precio de lista. Captura el total.';
      }
    });
  }

  onDescuentoTipoChange() {
    this.descuentoValor = 0;
    // Quitar el descuento es quitar la promoción: la cita ya no cuenta para su cupo
    if (this.descuentoTipo === 'Ninguno') {
      this.promocionIdAsociada = null;
      this.promocionNombreAsociada = null;
    }
  }

  obtenerDescuentoCalculado(): number {
    const valor = Number(this.descuentoValor) || 0;
    if (valor <= 0) return 0;
    if (this.descuentoTipo === 'Porcentaje') {
      return (Number(this.costoTotal) || 0) * (valor / 100);
    } else if (this.descuentoTipo === 'Monto') {
      return valor;
    }
    return 0;
  }

  /** Un descuento mal capturado no debe llegar a caja. */
  get descuentoInvalido(): boolean {
    return this.mensajeDescuentoInvalido !== null;
  }

  get mensajeDescuentoInvalido(): string | null {
    if (this.descuentoTipo === 'Ninguno') return null;
    const valor = Number(this.descuentoValor) || 0;
    if (valor < 0) return 'El descuento no puede ser negativo.';
    if (this.descuentoTipo === 'Porcentaje' && valor > 100) {
      return 'El porcentaje no puede pasar de 100%.';
    }
    if (this.descuentoTipo === 'Monto' && valor > (Number(this.costoTotal) || 0)) {
      return 'El descuento no puede ser mayor al costo total.';
    }
    return null;
  }

  obtenerTotalNetoACobrar(): number {
    const desc = this.obtenerDescuentoCalculado();
    const anti = this.event?.montoAnticipo || 0;
    const neto = this.costoTotal - desc - anti;
    return neto < 0 ? 0 : neto;
  }

  guardarCobro(): void {
    if (this.costoTotal <= 0) {
      this.swal.error('El costo total debe ser mayor a 0');
      return;
    }
    const desc = this.obtenerDescuentoCalculado();
    if (desc > this.costoTotal) {
      this.swal.error('El descuento no puede superar el costo total');
      return;
    }

    this.guardandoCobro = true;
    const payload = {
      costoTotal: this.costoTotal,
      descuentoTipo: this.descuentoTipo,
      descuentoValor: this.descuentoValor,
      metodoPago: this.metodoPago,
      promocionId: this.promocionIdAsociada
    };

    this.citasService.registrarCobro(this.event.citaId, payload).subscribe({
      next: () => {
        this.swal.success('Cobro registrado correctamente');
        this.guardandoCobro = false;
        this.mostrarPanelCobro = false;
        this.cobroRegistrado.emit(); // Notificar para recargar calendario
        this.closeModal();
      },
      error: (err) => {
        this.guardandoCobro = false;
        this.swal.error(err.error?.message || 'Error al registrar el cobro');
      }
    });
  }

  onOpenWhatsApp() {
    if (this.event?.pacienteTelefono) {
      window.open(`https://wa.me/${this.event.pacienteTelefono}`, '_blank');
    }
  }

  onOpenGoogleCalendar() {
    if (this.event?.htmlLink) {
      window.open(this.event.htmlLink, '_blank');
    }
  }
}
