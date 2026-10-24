import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

export interface DestinoRapido {
  label: string;
  grupo: string;
  icon: string;
  link: string;
  tab?: string;
}

interface Resultado {
  tipo: 'paciente' | 'destino';
  titulo: string;
  detalle: string;
  icon: string;
  link: string;
  queryParams?: Record<string, string>;
}

// La lista de pacientes se comparte entre aperturas y se refresca cada 5 min
let cachePacientes: { cargados: number; datos: any[] } | null = null;
const VIGENCIA_CACHE = 5 * 60 * 1000;

const normalizar = (texto: string) =>
  String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Buscador del panel (⌘K / Ctrl+K): abre el expediente de un paciente o salta a una sección
@Component({
  selector: 'app-busqueda-rapida',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './busqueda-rapida.component.html',
  styleUrl: './busqueda-rapida.component.scss'
})
export class BusquedaRapidaComponent implements OnInit, AfterViewInit {
  @Input() destinos: DestinoRapido[] = [];
  @Output() cerrar = new EventEmitter<void>();
  @ViewChild('campo') campo?: ElementRef<HTMLInputElement>;

  consulta = '';
  seleccion = 0;
  cargandoPacientes = false;
  errorPacientes = false;
  private pacientes: any[] = [];

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    if (cachePacientes && Date.now() - cachePacientes.cargados < VIGENCIA_CACHE) {
      this.pacientes = cachePacientes.datos;
      return;
    }
    this.cargandoPacientes = true;
    this.http.get<any[]>(`${environment.apiUrl}/pacientes`).subscribe({
      next: (datos) => {
        this.pacientes = datos || [];
        cachePacientes = { cargados: Date.now(), datos: this.pacientes };
        this.cargandoPacientes = false;
      },
      error: () => {
        this.errorPacientes = true;
        this.cargandoPacientes = false;
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.campo?.nativeElement.focus());
  }

  get resultadosPacientes(): Resultado[] {
    const q = normalizar(this.consulta);
    if (q.length < 2) return [];
    const digitos = q.replace(/\D/g, '');
    return this.pacientes
      .filter(p => {
        const nombre = normalizar(`${p.nombre} ${p.apeP} ${p.apeM} ${p.apodo || ''}`);
        const tel = `${p.telefonoWhatsapp || ''} ${p.telefonoPaciente || ''}`;
        return q.split(/\s+/).every(parte => nombre.includes(parte)) || (digitos.length >= 3 && tel.includes(digitos));
      })
      .slice(0, 7)
      .map(p => ({
        tipo: 'paciente' as const,
        titulo: `${p.nombre} ${p.apeP} ${p.apeM || ''}`.trim(),
        detalle: String(p.telefonoWhatsapp || p.telefonoPaciente || ''),
        icon: 'fa-user',
        link: `/admin/pacientes/perfil/${p._id}`
      }));
  }

  get resultadosDestinos(): Resultado[] {
    const q = normalizar(this.consulta);
    return this.destinos
      .filter(d => !q || normalizar(`${d.label} ${d.grupo}`).includes(q))
      .slice(0, q ? 5 : 8)
      .map(d => ({
        tipo: 'destino' as const,
        titulo: d.label,
        detalle: d.grupo,
        icon: d.icon,
        link: d.link,
        queryParams: d.tab ? { tab: d.tab } : undefined
      }));
  }

  // Pacientes primero cuando se escribe: es lo que más se busca
  get resultados(): Resultado[] {
    return [...this.resultadosPacientes, ...this.resultadosDestinos];
  }

  claseIcono(icon: string): string {
    return icon.includes(' ') ? icon : `fas ${icon}`;
  }

  alEscribir(): void {
    this.seleccion = 0;
  }

  teclado(event: KeyboardEvent): void {
    const total = this.resultados.length;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.seleccion = total ? (this.seleccion + 1) % total : 0;
      this.mostrarSeleccion();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.seleccion = total ? (this.seleccion - 1 + total) % total : 0;
      this.mostrarSeleccion();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const r = this.resultados[this.seleccion];
      if (r) this.ir(r);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrar.emit();
    }
  }

  private mostrarSeleccion(): void {
    setTimeout(() => document.getElementById(`resultado-${this.seleccion}`)?.scrollIntoView({ block: 'nearest' }));
  }

  ir(r: Resultado): void {
    this.router.navigate([r.link], { queryParams: r.queryParams });
    this.cerrar.emit();
  }
}
