import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';
import { Campana, CampanasService, CanalCampana, DisparadorCampana, disparadoresDe } from '../../../services/campanas/campanas.service';
import { UserService, Usuario } from '../../../services/user/user.service';
import { SelectorPublicacionComponent } from '../selector-publicacion/selector-publicacion.component';
import { PromocionesService } from '../../../services/promociones/promociones.service';
import { FlujosService } from '../../../services/flujos/flujos.service';

// <input type="date"> trabaja con "YYYY-MM-DD" en hora local; el backend guarda
// instantes. Se envía inicio y fin del día local para que una campaña que
// "termina el 30" siga activa todo el 30 en México y no se corte a las 18:00.
const aFechaLocal = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const instanteLocal = (fecha: string, finDelDia: boolean): string => {
  const [y, m, d] = fecha.split('-').map(Number);
  return (finDelDia ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d)).toISOString();
};

@Component({
  selector: 'app-campana-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SelectorPublicacionComponent],
  templateUrl: './campana-form.component.html',
  styleUrl: './campana-form.component.css'
})
export class CampanaFormComponent implements OnInit {
  @Input() campana: Campana | null = null;
  @Output() guardado = new EventEmitter<Campana>();
  @Output() cerrado = new EventEmitter<void>();

  modelo!: Campana;
  nuevaPalabra = '';
  nuevaEtiqueta = '';
  nuevoAnuncio = '';
  fechaInicio = '';
  fechaFin = '';
  doctores: Usuario[] = [];
  promociones: { _id: string; nombre: string; vigente: boolean }[] = [];
  flujos: { _id: string; nombre: string; activo: boolean }[] = [];
  guardando = false;

  readonly variableNombre = '{{nombre}}';
  readonly placeholderMensaje = 'Hola {{nombre}} 👋 Gracias por escribirnos. Te comparto la información…';
  readonly opcionesDisparador: { valor: DisparadorCampana; titulo: string; descripcion: string; icono: string }[] = [
    { valor: 'palabra_clave', titulo: 'Palabra clave', descripcion: 'Te escriben una palabra por mensaje.', icono: 'fas fa-comment-dots' },
    { valor: 'comentario', titulo: 'Comentario', descripcion: 'Comentan una palabra en una publicación.', icono: 'fas fa-comments' },
    { valor: 'enlace', titulo: 'Enlace', descripcion: 'Entran por un link de anuncio, bio o QR.', icono: 'fas fa-link' },
    { valor: 'anuncio', titulo: 'Anuncio de Meta', descripcion: 'Tocan tu anuncio; basta con que digan “Hola”.', icono: 'fas fa-ad' }
  ];

  constructor(
    private campanasService: CampanasService,
    private userService: UserService,
    private promocionesService: PromocionesService,
    private flujosService: FlujosService
  ) {}

  get esEdicion(): boolean {
    return !!this.campana?._id;
  }

  ngOnInit() {
    const base: Campana = {
      nombre: '',
      descripcion: '',
      canal: 'WhatsApp',
      disparador: 'palabra_clave',
      disparadores: ['palabra_clave'],
      palabrasClave: [],
      coincidencia: 'contiene',
      publicacionId: '',
      codigo: '',
      mensajeEnlace: 'Hola, quiero información',
      respuesta: { mensaje: '', mediaUrl: '' },
      respuestaComentario: '',
      etiquetas: [],
      interes: 'Desconocido',
      idDoctor: null,
      promocionId: null,
      anuncioIds: [],
      flujoId: null,
      estado: 'Borrador'
    };

    const c = this.campana;
    this.modelo = c
      ? {
          ...base,
          ...c,
          palabrasClave: [...c.palabrasClave],
          etiquetas: [...c.etiquetas],
          anuncioIds: [...(c.anuncioIds || [])],
          disparadores: [...disparadoresDe(c)],
          respuesta: { ...base.respuesta, ...c.respuesta }
        }
      : base;
    this.fechaInicio = aFechaLocal(c?.fechaInicio);
    this.fechaFin = aFechaLocal(c?.fechaFin);

    this.userService.getUsuarios().subscribe({
      next: (usuarios) => {
        this.doctores = Array.isArray(usuarios)
          ? usuarios.filter(u => u.tipo === 'Doctor' || u.tipo === 'Especialista')
          : [];
      },
      error: () => this.doctores = []
    });

    this.flujosService.obtenerFlujos().subscribe({
      next: (flujos) => this.flujos = flujos.map(f => ({ _id: f._id!, nombre: f.nombre, activo: f.estado === 'Activo' })),
      error: () => this.flujos = []
    });

    // Se listan también las que aún no empiezan, para preparar la campaña antes
    this.promocionesService.obtenerPromociones().subscribe({
      next: (promos) => {
        const ahora = Date.now();
        this.promociones = promos
          .filter(p => new Date(p.fechaFin).getTime() >= ahora || p._id === this.modelo.promocionId)
          .map(p => ({
            _id: p._id!,
            nombre: p.nombre,
            vigente: p.activo && new Date(p.fechaInicio).getTime() <= ahora && new Date(p.fechaFin).getTime() >= ahora
          }));
      },
      error: () => this.promociones = []
    });
  }

  // Las promociones son de estética: la campaña se marca con ese interés
  alElegirPromocion(id: string | null) {
    if (id && (this.modelo.interes === 'Desconocido' || this.modelo.interes === 'Dental')) {
      this.modelo.interes = 'Estetica';
    }
  }

  @HostListener('document:keydown.escape')
  cerrar() {
    if (!this.guardando) this.cerrado.emit();
  }

  elegirCanal(canal: CanalCampana) {
    this.modelo.canal = canal;
    if (canal === 'WhatsApp' && this.tiene('comentario')) {
      this.alternar('comentario');
      if (!this.modelo.disparadores!.length) this.modelo.disparadores!.push('palabra_clave');
    }
  }

  tiene(disparador: DisparadorCampana): boolean {
    return this.modelo.disparadores!.includes(disparador);
  }

  // Se pueden combinar: la misma campaña responde a la palabra, al comentario, al enlace y al anuncio
  alternar(disparador: DisparadorCampana) {
    const lista = this.modelo.disparadores!;
    const i = lista.indexOf(disparador);
    if (i >= 0) lista.splice(i, 1);
    else lista.push(disparador);
  }

  agregar(lista: string[], campo: 'nuevaPalabra' | 'nuevaEtiqueta' | 'nuevoAnuncio', evento?: Event) {
    evento?.preventDefault();
    const valores = this[campo].split(',').map(v => v.trim()).filter(Boolean);
    for (const valor of valores) {
      if (!lista.some(x => x.toLowerCase() === valor.toLowerCase())) lista.push(valor);
    }
    this[campo] = '';
  }

  quitar(lista: string[], indice: number) {
    lista.splice(indice, 1);
  }

  limpiarCodigo(valor: string): string {
    return (valor || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  // Las palabras clave sólo aplican a los disparadores por texto
  get usaPalabras(): boolean {
    return this.tiene('palabra_clave') || this.tiene('comentario');
  }

  get flujoElegido() {
    return this.flujos.find(f => f._id === this.modelo.flujoId) || null;
  }

  get mensajeEntrada(): string {
    const m = this.modelo;
    if (this.usaPalabras) return m.palabrasClave[0] || 'Mensaje con tu palabra clave';
    if (this.tiene('enlace')) {
      return m.canal === 'WhatsApp' ? `${m.mensajeEnlace} ${m.codigo || 'CODIGO'}` : 'Entra desde tu enlace';
    }
    return 'Hola';
  }

  vistaPrevia(texto: string): string {
    return (texto || '').replace(/\{\{\s*nombre\s*\}\}/gi, 'María');
  }

  private validar(): string | null {
    const m = this.modelo;
    if (!m.nombre.trim()) return 'Ponle un nombre a la campaña.';
    if (!m.disparadores!.length) return 'Elige al menos un disparador.';
    if (this.usaPalabras && m.palabrasClave.length === 0) return 'Agrega al menos una palabra clave.';
    if (this.tiene('anuncio') && m.anuncioIds.length === 0) return 'Agrega el ID de al menos un anuncio.';
    if (this.fechaInicio && this.fechaFin && this.fechaFin < this.fechaInicio) return 'La fecha de fin es anterior a la de inicio.';
    return null;
  }

  guardar(activar: boolean) {
    // Lo que quedó escrito sin pulsar Enter también cuenta
    if (this.nuevaPalabra.trim()) this.agregar(this.modelo.palabrasClave, 'nuevaPalabra');
    if (this.nuevaEtiqueta.trim()) this.agregar(this.modelo.etiquetas, 'nuevaEtiqueta');
    if (this.nuevoAnuncio.trim()) this.agregar(this.modelo.anuncioIds, 'nuevoAnuncio');

    const error = this.validar();
    if (error) {
      Swal.fire('Revisa la campaña', error, 'warning');
      return;
    }

    const { _id, enlace, metricas, createdAt, estado, ...datos } = this.modelo;
    const payload: Partial<Campana> = {
      ...datos,
      disparador: datos.disparadores![0],
      palabrasClave: this.usaPalabras ? datos.palabrasClave : [],
      fechaInicio: this.fechaInicio ? instanteLocal(this.fechaInicio, false) : null,
      fechaFin: this.fechaFin ? instanteLocal(this.fechaFin, true) : null
    };
    if (!payload.codigo) delete payload.codigo;
    if (!this.esEdicion && activar) payload.estado = 'Activa';

    this.guardando = true;
    const peticion = this.esEdicion
      ? this.campanasService.actualizarCampana(this.campana!._id!, payload)
      : this.campanasService.crearCampana(payload);

    peticion.subscribe({
      next: (guardada) => {
        this.guardando = false;
        this.guardado.emit(guardada);
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('No se pudo guardar', err.error?.message || 'Intenta de nuevo.', 'error');
      }
    });
  }
}
