import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Campana, CampanasService, EstadoCampana, RegistroCampana } from '../../services/campanas/campanas.service';
import { AuthService } from '../../services/auth/auth.service';
import { CampanaFormComponent } from '../../components/campanas/campana-form/campana-form.component';

interface AccionEstado {
  estado: EstadoCampana;
  etiqueta: string;
  icono: string;
}

// Constante para que *ngFor no reciba arreglos nuevos en cada ciclo de detección
const ACCIONES: Record<EstadoCampana, AccionEstado[]> = {
  Borrador: [{ estado: 'Activa', etiqueta: 'Activar', icono: 'fas fa-play' }],
  Activa: [
    { estado: 'Pausada', etiqueta: 'Pausar', icono: 'fas fa-pause' },
    { estado: 'Finalizada', etiqueta: 'Finalizar', icono: 'fas fa-flag-checkered' }
  ],
  Pausada: [
    { estado: 'Activa', etiqueta: 'Reanudar', icono: 'fas fa-play' },
    { estado: 'Finalizada', etiqueta: 'Finalizar', icono: 'fas fa-flag-checkered' }
  ],
  Finalizada: [{ estado: 'Activa', etiqueta: 'Reactivar', icono: 'fas fa-redo' }]
};

@Component({
  selector: 'app-campanas',
  standalone: true,
  imports: [CommonModule, FormsModule, CampanaFormComponent],
  templateUrl: './campanas.component.html',
  styleUrl: './campanas.component.css'
})
export class CampanasComponent implements OnInit {
  campanas: Campana[] = [];
  seleccionada: Campana | null = null;
  registros: RegistroCampana[] = [];
  cargando = true;
  cargandoRegistros = false;

  filtroCanal = '';
  filtroEstado = '';
  busqueda = '';

  formularioAbierto = false;
  campanaEnEdicion: Campana | null = null;
  esAdmin = false;

  readonly estados: EstadoCampana[] = ['Borrador', 'Activa', 'Pausada', 'Finalizada'];
  readonly acciones = ACCIONES;
  readonly disparadores: Record<string, string> = {
    palabra_clave: 'Palabra clave',
    comentario: 'Comentario',
    enlace: 'Enlace'
  };

  constructor(
    private campanasService: CampanasService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.esAdmin = (this.authService.getUsuario() as any)?.tipo === 'Administrador';
    this.cargar();
  }

  cargar(idSeleccionar?: string) {
    this.cargando = true;
    this.campanasService.obtenerCampanas().subscribe({
      next: (campanas) => {
        this.campanas = campanas;
        this.cargando = false;
        const id = idSeleccionar ?? this.seleccionada?._id;
        const encontrada = id ? campanas.find(c => c._id === id) : undefined;
        if (encontrada) {
          this.seleccionar(encontrada);
        } else {
          this.seleccionada = null;
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar las campañas.', 'error');
      }
    });
  }

  get filtradas(): Campana[] {
    const q = this.busqueda.trim().toLowerCase();
    return this.campanas.filter(c =>
      (!this.filtroCanal || c.canal === this.filtroCanal) &&
      (!this.filtroEstado || c.estado === this.filtroEstado) &&
      (!q ||
        c.nombre.toLowerCase().includes(q) ||
        (c.codigo || '').toLowerCase().includes(q) ||
        c.palabrasClave.some(p => p.toLowerCase().includes(q)))
    );
  }

  get totales() {
    const lista = this.filtradas;
    const suma = (campo: 'inscritos' | 'nuevos' | 'conversiones') =>
      lista.reduce((acc, c) => acc + (c.metricas?.[campo] || 0), 0);
    return {
      activas: lista.filter(c => c.estado === 'Activa').length,
      inscritos: suma('inscritos'),
      nuevos: suma('nuevos'),
      conversiones: suma('conversiones')
    };
  }

  trackById(_: number, c: Campana) {
    return c._id;
  }

  seleccionar(campana: Campana) {
    const cambio = this.seleccionada?._id !== campana._id;
    this.seleccionada = campana;
    this.cargarRegistros(campana._id!);

    if (cambio && window.matchMedia('(max-width: 1100px)').matches) {
      setTimeout(() => document.getElementById('cp-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  private cargarRegistros(id: string) {
    this.cargandoRegistros = true;
    this.campanasService.obtenerRegistros(id).subscribe({
      next: (registros) => {
        // Si el usuario cambió de campaña mientras cargaba, se descarta
        if (this.seleccionada?._id !== id) return;
        this.registros = registros;
        this.cargandoRegistros = false;
      },
      error: () => {
        if (this.seleccionada?._id !== id) return;
        this.registros = [];
        this.cargandoRegistros = false;
      }
    });
  }

  resumenDisparador(c: Campana): string {
    if (c.disparador === 'enlace') return c.codigo || '';
    const palabras = c.palabrasClave.join(', ');
    if (c.disparador === 'comentario') {
      return `${palabras} · ${c.publicacionId ? 'una publicación' : 'cualquier publicación'}`;
    }
    return palabras;
  }

  fraseDisparo(c: Campana): string {
    const accion = c.disparador === 'comentario' ? 'comente' : 'escriba';
    return c.coincidencia === 'exacta'
      ? `Cuando alguien ${accion} exactamente:`
      : `Cuando alguien ${accion} algo que incluya:`;
  }

  mensajeEntrada(c: Campana): string {
    if (c.disparador === 'enlace') {
      return c.canal === 'WhatsApp' ? `${c.mensajeEnlace} ${c.codigo}` : 'Entra desde el enlace';
    }
    return c.palabrasClave[0] || '';
  }

  vistaPrevia(texto: string): string {
    return (texto || '').replace(/\{\{\s*nombre\s*\}\}/gi, 'María');
  }

  tasaConversion(c: Campana): number {
    const inscritos = c.metricas?.inscritos || 0;
    return inscritos ? Math.round(((c.metricas?.conversiones || 0) / inscritos) * 100) : 0;
  }

  abrirNueva() {
    this.campanaEnEdicion = null;
    this.formularioAbierto = true;
  }

  editar(campana: Campana) {
    this.campanaEnEdicion = campana;
    this.formularioAbierto = true;
  }

  onGuardado(campana: Campana) {
    this.formularioAbierto = false;
    this.cargar(campana._id);
    Swal.fire({
      toast: true, position: 'top-end', timer: 2500, showConfirmButton: false,
      icon: 'success', title: 'Campaña guardada'
    });
  }

  async cambiarEstado(campana: Campana, estado: EstadoCampana) {
    if (estado === 'Finalizada') {
      const { isConfirmed } = await Swal.fire({
        title: '¿Finalizar campaña?',
        text: 'El bot dejará de responder a sus disparadores. El historial se conserva y puedes reactivarla después.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Finalizar',
        cancelButtonText: 'Cancelar'
      });
      if (!isConfirmed) return;
    }

    this.campanasService.cambiarEstado(campana._id!, estado).subscribe({
      next: (actualizada) => {
        this.campanas = this.campanas.map(c => c._id === actualizada._id ? actualizada : c);
        this.seleccionada = actualizada;
      },
      error: (err) => Swal.fire('No se pudo cambiar el estado', err.error?.message || 'Intenta de nuevo.', 'error')
    });
  }

  async eliminar(campana: Campana) {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar campaña?',
      text: `"${campana.nombre}" se borrará definitivamente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#c0392b'
    });
    if (!isConfirmed) return;

    this.campanasService.eliminarCampana(campana._id!).subscribe({
      next: () => {
        this.seleccionada = null;
        this.cargar();
      },
      error: (err) => Swal.fire('No se pudo eliminar', err.error?.message || 'Intenta de nuevo.', 'error')
    });
  }

  copiar(texto: string) {
    navigator.clipboard.writeText(texto).then(
      () => Swal.fire({ toast: true, position: 'top-end', timer: 2000, showConfirmButton: false, icon: 'success', title: 'Enlace copiado' }),
      () => Swal.fire('No se pudo copiar', texto, 'info')
    );
  }
}
