import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AceptacionesService } from '../../services/aceptaciones/aceptaciones.service';
import { LADAS } from '../pagar-promo/pagar-promo.component';

type Paso = 'numero' | 'confirmar' | 'aceptar' | 'listo';

// Enlace que recepción manda a quien pagó por OXXO, transferencia, etc. (/aceptar/<codigo>)
// o el enlace público fijo (/aceptar): número con lada → confirmar número → aceptar
// términos y aviso de privacidad.
@Component({
  selector: 'app-aceptar-terminos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './aceptar-terminos.component.html',
  styleUrls: ['../pagar-promo/pagar-promo.component.css', './aceptar-terminos.component.css']
})
export class AceptarTerminosComponent implements OnInit {
  readonly ladas = LADAS;

  codigo = '';
  solicitud: any = null;
  cargando = true;
  noExiste = false;

  paso: Paso = 'numero';
  lada = '52';
  ladaOtra = '';
  telefono = '';
  acepta = false;
  enviando = false;
  error = '';
  resultado: any = null;

  constructor(private route: ActivatedRoute, private aceptaciones: AceptacionesService) {}

  ngOnInit(): void {
    this.codigo = this.route.snapshot.paramMap.get('codigo') || '';
    // Enlace público: no hay solicitud que cargar
    if (!this.codigo) {
      this.solicitud = { publico: true };
      this.cargando = false;
      return;
    }
    this.aceptaciones.ver(this.codigo).subscribe({
      next: (s) => {
        this.solicitud = s;
        if (s.estado === 'aceptado') {
          this.resultado = { telefono: s.telefono, aceptadoEn: s.aceptadoEn };
          this.paso = 'listo';
        }
        this.cargando = false;
      },
      error: () => {
        this.noExiste = true;
        this.cargando = false;
      }
    });
  }

  get ladaFinal(): string {
    return this.lada === 'otra' ? this.ladaOtra : this.lada;
  }

  // México siempre son 10 dígitos; otros países varían
  get telefonoValido(): boolean {
    const lada = this.ladaFinal;
    if (!/^\d{1,4}$/.test(lada)) return false;
    return lada === '52' ? this.telefono.length === 10 : this.telefono.length >= 6 && this.telefono.length <= 12;
  }

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

  cambiarNumero(): void {
    this.acepta = false;
    this.error = '';
    this.paso = 'numero';
  }

  enviar(): void {
    if (!this.acepta || this.enviando) return;
    this.enviando = true;
    this.error = '';
    const datos = { lada: this.ladaFinal, telefono: this.telefono, acepta: true };
    const peticion = this.codigo ? this.aceptaciones.aceptar(this.codigo, datos) : this.aceptaciones.aceptarPublico(datos);
    peticion.subscribe({
      next: (res) => {
        this.resultado = res;
        this.paso = 'listo';
        this.enviando = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'No pudimos registrar tu aceptación. Intenta de nuevo.';
        this.enviando = false;
      }
    });
  }

  fecha(valor: string): string {
    return new Date(valor).toLocaleString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City'
    });
  }
}
