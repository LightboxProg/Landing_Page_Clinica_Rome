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
          <div class="info-row">
            <i class="fas fa-user-md icon-primary"></i>
            <div class="info-text">
              <span class="label">Médico</span>
              <span class="value">{{ event?.medicoNombre }}</span>
            </div>
          </div>
          
          <div class="info-row">
            <i class="fas fa-stethoscope icon-primary"></i>
            <div class="info-text">
              <span class="label">Servicio</span>
              <span class="value">{{ event?.servicioNombre }}</span>
            </div>
          </div>

          <div class="info-row" *ngIf="event?.pacienteTelefono">
            <i class="fas fa-phone-alt icon-primary"></i>
            <div class="info-text">
              <span class="label">Teléfono</span>
              <span class="value">{{ event?.pacienteTelefono }}</span>
            </div>
          </div>

          <div *ngIf="event?.description" class="notes-section">
            <span class="label">Notas:</span>
            <p class="notes-text">{{ event?.description }}</p>
          </div>

          <!-- Información de Pago/Cobro -->
          <div class="payment-section" *ngIf="event?.citaId">
            <h4 class="section-title"><i class="fas fa-file-invoice-dollar"></i> Estado de Pago</h4>
            
            <!-- Si ya está cobrada -->
            <div class="payment-status-box paid" *ngIf="event?.cobrado">
              <div class="status-header">
                <span class="status-badge-paid"><i class="fas fa-check-circle"></i> Cita Cobrada</span>
              </div>
              <div class="payment-details">
                <div class="detail-row">
                  <span>Costo Total:</span>
                  <strong>{{ event.costoTotal | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="detail-row" *ngIf="event.montoAnticipo > 0">
                  <span>Anticipo Stripe:</span>
                  <strong class="text-stripe">-{{ event.montoAnticipo | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="detail-row" *ngIf="event.descuentoMonto > 0">
                  <span>Descuento:</span>
                  <strong class="text-discount">-{{ event.descuentoMonto | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="detail-row total">
                  <span>Cobrado en Clínica:</span>
                  <strong class="text-success">{{ event.montoPagadoClinica | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="detail-row font-sm" *ngIf="event.metodoPago !== 'Ninguno'">
                  <span>Método de pago:</span>
                  <span>{{ event.metodoPago }}</span>
                </div>
              </div>
            </div>

            <!-- Si NO está cobrada pero tiene anticipo de Stripe -->
            <div class="payment-status-box pending" *ngIf="!event?.cobrado">
              <div class="status-header">
                <span class="status-badge-pending"><i class="fas fa-clock"></i> Pendiente de cobro</span>
              </div>
              <div class="payment-details">
                <div class="detail-row" *ngIf="event.montoAnticipo > 0">
                  <span>Anticipo Pagado (Stripe):</span>
                  <strong class="text-stripe">{{ event.montoAnticipo | currency:'MXN':'symbol':'1.2-2' }}</strong>
                </div>
              </div>

              <!-- Botón para expandir panel de cobro (sólo Admin/Recepcionista) -->
              <button 
                *ngIf="puedeVender && !mostrarPanelCobro" 
                class="btn-cobrar-trigger" 
                (click)="abrirPanelCobro()">
                <i class="fas fa-cash-register"></i> Registrar Cobro / Completar
              </button>
            </div>

            <!-- Panel interactivo de cobro -->
            <div class="panel-cobro" *ngIf="mostrarPanelCobro && !event?.cobrado">
              <div class="panel-cobro-title">Registrar Transacción de Caja</div>
              
              <div class="form-group">
                <label>Costo Total del Servicio ($) *</label>
                <input 
                  type="number" 
                  [(ngModel)]="costoTotal" 
                  placeholder="Costo total de la consulta"
                  class="form-control"
                  min="0"
                />
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label>Tipo Descuento</label>
                  <select [(ngModel)]="descuentoTipo" class="form-control" (change)="onDescuentoTipoChange()">
                    <option value="Ninguno">Ninguno</option>
                    <option value="Porcentaje">Porcentaje (%)</option>
                    <option value="Monto">Monto Fijo ($)</option>
                  </select>
                </div>
                <div class="form-group" *ngIf="descuentoTipo !== 'Ninguno'">
                  <label>Valor Descuento</label>
                  <input 
                    type="number" 
                    [(ngModel)]="descuentoValor" 
                    class="form-control"
                    min="0"
                  />
                </div>
              </div>

              <!-- Desglose dinámico de cobro -->
              <div class="desglose-cobro">
                <div class="desglose-row">
                  <span>Costo Total:</span>
                  <span>{{ costoTotal | currency:'MXN' }}</span>
                </div>
                <div class="desglose-row text-discount" *ngIf="descuentoTipo !== 'Ninguno' && descuentoValor > 0">
                  <span>Descuento aplicado:</span>
                  <span>-{{ obtenerDescuentoCalculado() | currency:'MXN' }}</span>
                </div>
                <div class="desglose-row text-stripe" *ngIf="event.montoAnticipo > 0">
                  <span>Anticipo Stripe:</span>
                  <span>-{{ event.montoAnticipo | currency:'MXN' }}</span>
                </div>
                <div class="desglose-row total">
                  <span>Restante a cobrar en clínica:</span>
                  <strong>{{ obtenerTotalNetoACobrar() | currency:'MXN' }}</strong>
                </div>
              </div>

              <div class="form-group">
                <label>Método de Pago (Clínica) *</label>
                <select [(ngModel)]="metodoPago" class="form-control">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta (Terminal)</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                </select>
              </div>

              <div class="panel-cobro-actions">
                <button type="button" class="btn-cancel-cobro" (click)="mostrarPanelCobro = false">Cancelar</button>
                <button 
                  type="button" 
                  class="btn-confirm-cobro" 
                  [disabled]="costoTotal <= 0 || guardandoCobro"
                  (click)="guardarCobro()">
                  {{ guardandoCobro ? 'Guardando...' : 'Confirmar Cobro' }}
                </button>
              </div>
            </div>

          </div>
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
      
      if (this.event) {
        // Inicializar costo sugerido
        this.costoTotal = this.event.costoTotal || 0;
      }
    }
  }

  closeModal() {
    this.close.emit();
  }

  abrirPanelCobro() {
    this.mostrarPanelCobro = true;
    
    // Si no se ha ingresado un costo, obtener el precio del servicio o promo
    if (this.costoTotal <= 0 && this.event?.servicioId) {
      this.promosService.obtenerPrecioSugerido(this.event.servicioId).subscribe({
        next: (res) => {
          this.costoTotal = res.costoSugerido;
          if (res.promocionId) {
            this.promocionIdAsociada = res.promocionId;
            this.promocionNombreAsociada = res.promocionNombre;
            this.swal.toast(`Campaña "${res.promocionNombre}" aplicada automáticamente.`);
          }
        },
        error: () => {
          // Fallback en caso de error
          this.costoTotal = 500;
        }
      });
    } else if (this.costoTotal <= 0) {
      this.costoTotal = 500;
    }
  }

  onDescuentoTipoChange() {
    this.descuentoValor = 0;
  }

  obtenerDescuentoCalculado(): number {
    if (this.descuentoTipo === 'Porcentaje') {
      return this.costoTotal * (this.descuentoValor / 100);
    } else if (this.descuentoTipo === 'Monto') {
      return this.descuentoValor;
    }
    return 0;
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
