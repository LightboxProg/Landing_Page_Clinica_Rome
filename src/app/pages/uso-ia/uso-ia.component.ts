import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IaService, OrigenIA, UsoIA } from '../../services/ia/ia.service';

interface BarraDia {
  dia: number;
  fecha: string;
  llamadas: number;
  costoUSD: number;
  alto: number;
}

const ORIGENES: Record<OrigenIA, { nombre: string; ayuda: string }> = {
  bot: { nombre: 'Bot', ayuda: 'Mensajes que las reglas no entendieron' },
  flujo: { nombre: 'Flujos', ayuda: 'Respuestas a preguntas de un flujo' },
  simulador: { nombre: 'Simulador', ayuda: 'Pruebas en el editor de flujos' }
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const mesDe = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

@Component({
  selector: 'app-uso-ia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './uso-ia.component.html',
  styleUrl: './uso-ia.component.css'
})
export class UsoIaComponent implements OnInit {
  readonly origenes = ORIGENES;

  mes = mesDe(new Date());
  meses: { valor: string; etiqueta: string }[] = [];
  uso: UsoIA | null = null;
  cargando = true;
  error = '';
  verTabla = false;
  diaActivo: BarraDia | null = null;

  constructor(private iaService: IaService) {}

  ngOnInit() {
    // Los últimos 12 meses; el registro se guarda 400 días
    const hoy = new Date();
    for (let i = 0; i < 12; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      this.meses.push({ valor: mesDe(fecha), etiqueta: `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}` });
    }
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.error = '';
    this.diaActivo = null;
    this.iaService.obtenerUso(this.mes).subscribe({
      next: (uso) => {
        this.uso = uso;
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'No se pudo cargar el uso de IA.';
      }
    });
  }

  get esMesActual(): boolean {
    return this.mes === mesDe(new Date());
  }

  // Un renglón por día del mes, aunque no haya llamadas, para que la gráfica no se encoja
  get barras(): BarraDia[] {
    if (!this.uso) return [];
    const [anio, numero] = this.mes.split('-').map(Number);
    const dias = new Date(anio, numero, 0).getDate();
    const porFecha = new Map(this.uso.porDia.map(d => [d.fecha, d]));
    const maximo = Math.max(0, ...this.uso.porDia.map(d => d.costoUSD));

    return Array.from({ length: dias }, (_, i) => {
      const fecha = `${this.mes}-${String(i + 1).padStart(2, '0')}`;
      const dato = porFecha.get(fecha);
      const costoUSD = dato?.costoUSD || 0;
      return {
        dia: i + 1,
        fecha,
        llamadas: dato?.llamadas || 0,
        costoUSD,
        alto: maximo > 0 ? (costoUSD / maximo) * 100 : 0
      };
    });
  }

  get maximoDiario(): number {
    return Math.max(0, ...(this.uso?.porDia || []).map(d => d.costoUSD));
  }

  get diasConUso() {
    return (this.uso?.porDia || []).filter(d => d.llamadas > 0);
  }

  get porcentajeTopeHoy(): number {
    if (!this.uso) return 0;
    return Math.min(100, (this.uso.hoy.llamadas / this.uso.topes.diario) * 100);
  }

  get nivelTopeHoy(): 'ok' | 'aviso' | 'lleno' {
    const p = this.porcentajeTopeHoy;
    return p >= 100 ? 'lleno' : p >= 80 ? 'aviso' : 'ok';
  }

  // Costo promedio por llamada, en USD
  get promedioLlamada(): number {
    const t = this.uso?.totales;
    return t && t.llamadas ? t.costoUSD / t.llamadas : 0;
  }

  mxn(usd: number): number {
    return usd * (this.uso?.tipoCambio || 0);
  }

  // Montos tan chicos que con 2 decimales saldrían en $0.00
  usdTexto(usd: number): string {
    if (usd === 0) return '$0.00';
    if (usd < 0.01) return `$${usd.toFixed(4)}`;
    return `$${usd.toFixed(2)}`;
  }

  mxnTexto(usd: number): string {
    const pesos = this.mxn(usd);
    if (pesos === 0) return '$0.00';
    if (pesos < 0.01) return `$${pesos.toFixed(4)}`;
    return `$${pesos.toFixed(2)}`;
  }

  etiquetaDia(fecha: string): string {
    const [, m, d] = fecha.split('-').map(Number);
    return `${d} de ${MESES[m - 1]}`;
  }

  mostrarDia(barra: BarraDia | null) {
    this.diaActivo = barra;
  }
}
