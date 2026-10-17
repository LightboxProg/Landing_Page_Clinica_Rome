import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { Campana, CampanasService, CanalCampana, DisparadorCampana } from '../../../services/campanas/campanas.service';
import { UserService, Usuario } from '../../../services/user/user.service';
import { SelectorPublicacionComponent } from '../selector-publicacion/selector-publicacion.component';

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
  imports: [CommonModule, FormsModule, SelectorPublicacionComponent],
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
  fechaInicio = '';
  fechaFin = '';
  doctores: Usuario[] = [];
  guardando = false;

  readonly variableNombre = '{{nombre}}';
  readonly placeholderMensaje = 'Hola {{nombre}} 👋 Gracias por escribirnos. Te comparto la información…';
  readonly opcionesDisparador: { valor: DisparadorCampana; titulo: string; descripcion: string; icono: string }[] = [
    { valor: 'palabra_clave', titulo: 'Palabra clave', descripcion: 'Te escriben una palabra por mensaje.', icono: 'fas fa-comment-dots' },
    { valor: 'comentario', titulo: 'Comentario', descripcion: 'Comentan una palabra en una publicación.', icono: 'fas fa-comments' },
    { valor: 'enlace', titulo: 'Enlace', descripcion: 'Entran por un link de anuncio, bio o QR.', icono: 'fas fa-link' }
  ];

  constructor(
    private campanasService: CampanasService,
    private userService: UserService
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
      estado: 'Borrador'
    };

    const c = this.campana;
    this.modelo = c
      ? {
          ...base,
          ...c,
          palabrasClave: [...c.palabrasClave],
          etiquetas: [...c.etiquetas],
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
  }

  @HostListener('document:keydown.escape')
  cerrar() {
    if (!this.guardando) this.cerrado.emit();
  }

  elegirCanal(canal: CanalCampana) {
    this.modelo.canal = canal;
    if (canal === 'WhatsApp' && this.modelo.disparador === 'comentario') {
      this.modelo.disparador = 'palabra_clave';
    }
  }

  agregar(lista: string[], campo: 'nuevaPalabra' | 'nuevaEtiqueta', evento?: Event) {
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

  get mensajeEntrada(): string {
    const m = this.modelo;
    if (m.disparador === 'enlace') {
      return m.canal === 'WhatsApp' ? `${m.mensajeEnlace} ${m.codigo || 'CODIGO'}` : 'Entra desde tu enlace';
    }
    return m.palabrasClave[0] || 'Mensaje con tu palabra clave';
  }

  vistaPrevia(texto: string): string {
    return (texto || '').replace(/\{\{\s*nombre\s*\}\}/gi, 'María');
  }

  private validar(): string | null {
    const m = this.modelo;
    if (!m.nombre.trim()) return 'Ponle un nombre a la campaña.';
    if (m.disparador !== 'enlace' && m.palabrasClave.length === 0) return 'Agrega al menos una palabra clave.';
    if (this.fechaInicio && this.fechaFin && this.fechaFin < this.fechaInicio) return 'La fecha de fin es anterior a la de inicio.';
    return null;
  }

  guardar(activar: boolean) {
    // Lo que quedó escrito sin pulsar Enter también cuenta
    if (this.nuevaPalabra.trim()) this.agregar(this.modelo.palabrasClave, 'nuevaPalabra');
    if (this.nuevaEtiqueta.trim()) this.agregar(this.modelo.etiquetas, 'nuevaEtiqueta');

    const error = this.validar();
    if (error) {
      Swal.fire('Revisa la campaña', error, 'warning');
      return;
    }

    const { _id, enlace, metricas, createdAt, estado, ...datos } = this.modelo;
    const payload: Partial<Campana> = {
      ...datos,
      palabrasClave: datos.disparador === 'enlace' ? [] : datos.palabrasClave,
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
