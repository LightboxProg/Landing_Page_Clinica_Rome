import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { CuentaInstagram, InstagramService, PublicacionInstagram, TipoPublicacion } from '../../services/instagram/instagram.service';

interface ArchivoSeleccionado {
  archivo: File;
  vista: string;
  esVideo: boolean;
}

interface OpcionTipo {
  tipo: TipoPublicacion;
  etiqueta: string;
  icono: string;
  ayuda: string;
  acepta: string;
}

const MAX_CAPTION = 2200;
const MAX_HASHTAGS = 30;

@Component({
  selector: 'app-instagram',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instagram.component.html',
  styleUrl: './instagram.component.css'
})
export class InstagramComponent implements OnInit, OnDestroy {
  readonly tipos: OpcionTipo[] = [
    { tipo: 'imagen', etiqueta: 'Publicación', icono: 'far fa-image', ayuda: 'Una foto en el feed.', acepta: 'image/*' },
    { tipo: 'carrusel', etiqueta: 'Carrusel', icono: 'far fa-clone', ayuda: 'De 2 a 10 fotos o videos.', acepta: 'image/*,video/*' },
    { tipo: 'reel', etiqueta: 'Reel', icono: 'fas fa-film', ayuda: 'Un video vertical (MP4 o MOV).', acepta: 'video/*' },
    { tipo: 'historia', etiqueta: 'Historia', icono: 'far fa-circle', ayuda: 'Una foto o video que dura 24 h. Las historias no llevan texto.', acepta: 'image/*,video/*' }
  ];
  readonly etiquetaTipo: Record<TipoPublicacion, string> = { imagen: 'Publicación', carrusel: 'Carrusel', reel: 'Reel', historia: 'Historia' };
  readonly maxCaption = MAX_CAPTION;
  readonly maxHashtags = MAX_HASHTAGS;

  tipo: TipoPublicacion = 'imagen';
  archivos: ArchivoSeleccionado[] = [];
  caption = '';
  enviando = false;

  cuenta: CuentaInstagram | null = null;
  errorCuenta = '';
  publicaciones: PublicacionInstagram[] = [];
  cargando = true;

  private refresco?: ReturnType<typeof setInterval>;

  constructor(private instagramService: InstagramService) {}

  ngOnInit() {
    this.cargarCuenta();
    this.cargarPublicaciones();
  }

  ngOnDestroy() {
    clearInterval(this.refresco);
    this.archivos.forEach(a => URL.revokeObjectURL(a.vista));
  }

  get opcion(): OpcionTipo {
    return this.tipos.find(t => t.tipo === this.tipo)!;
  }

  get maxArchivos(): number {
    return this.tipo === 'carrusel' ? 10 : 1;
  }

  get hashtags(): number {
    return (this.caption.match(/#/g) || []).length;
  }

  // Motivo por el que todavía no se puede publicar; vacío cuando ya se puede
  get faltante(): string {
    if (this.archivos.length === 0) return 'Agrega un archivo';
    if (this.tipo === 'carrusel' && this.archivos.length < 2) return 'Un carrusel lleva al menos 2 archivos';
    if (this.tipo === 'reel' && !this.archivos[0].esVideo) return 'Un reel necesita un video';
    if (this.tipo === 'imagen' && this.archivos[0].esVideo) return 'Para videos usa Reel';
    if (this.caption.length > MAX_CAPTION) return 'El texto es demasiado largo';
    if (this.hashtags > MAX_HASHTAGS) return `Máximo ${MAX_HASHTAGS} hashtags`;
    return '';
  }

  cambiarTipo(tipo: TipoPublicacion) {
    this.tipo = tipo;
    // Quita lo que ya no cabe o no corresponde al nuevo tipo
    const acepta = (a: ArchivoSeleccionado) => tipo === 'reel' ? a.esVideo : tipo === 'imagen' ? !a.esVideo : true;
    const quedan = this.archivos.filter(acepta).slice(0, this.maxArchivos);
    this.archivos.filter(a => !quedan.includes(a)).forEach(a => URL.revokeObjectURL(a.vista));
    this.archivos = quedan;
  }

  agregarArchivos(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const nuevos = Array.from(input.files || []);
    input.value = '';
    if (this.maxArchivos === 1) this.quitarTodos();

    const espacio = this.maxArchivos - this.archivos.length;
    if (nuevos.length > espacio) {
      Swal.fire('Demasiados archivos', `Este tipo de publicación admite hasta ${this.maxArchivos}.`, 'info');
    }
    for (const archivo of nuevos.slice(0, espacio)) {
      this.archivos.push({ archivo, vista: URL.createObjectURL(archivo), esVideo: archivo.type.startsWith('video/') });
    }
  }

  quitar(indice: number) {
    URL.revokeObjectURL(this.archivos[indice].vista);
    this.archivos.splice(indice, 1);
  }

  mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= this.archivos.length) return;
    [this.archivos[indice], this.archivos[destino]] = [this.archivos[destino], this.archivos[indice]];
  }

  private quitarTodos() {
    this.archivos.forEach(a => URL.revokeObjectURL(a.vista));
    this.archivos = [];
  }

  async publicar() {
    if (this.faltante || this.enviando) return;
    const confirmacion = await Swal.fire({
      title: '¿Publicar en Instagram?',
      text: `Se publicará en @${this.cuenta?.usuario ?? 'la cuenta conectada'} de inmediato.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Publicar',
      cancelButtonText: 'Cancelar'
    });
    if (!confirmacion.isConfirmed) return;

    this.enviando = true;
    const caption = this.tipo === 'historia' ? '' : this.caption.trim();
    this.instagramService.publicar(this.tipo, this.archivos.map(a => a.archivo), caption).subscribe({
      next: (publicacion) => {
        this.enviando = false;
        this.publicaciones = [publicacion, ...this.publicaciones];
        this.quitarTodos();
        this.caption = '';
        this.programarRefresco();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Publicando… te avisamos aquí cuando salga.', showConfirmButton: false, timer: 3500 });
      },
      error: (err) => {
        this.enviando = false;
        Swal.fire('No se pudo publicar', err.error?.mensaje || 'Intenta de nuevo.', 'error');
      }
    });
  }

  copiarId(publicacion: PublicacionInstagram) {
    if (!publicacion.mediaId) return;
    navigator.clipboard.writeText(publicacion.mediaId).then(() =>
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'ID copiado. Pégalo en una campaña de comentarios.', showConfirmButton: false, timer: 3000 })
    );
  }

  private cargarCuenta() {
    this.instagramService.obtenerCuenta().subscribe({
      next: (cuenta) => { this.cuenta = cuenta; this.errorCuenta = ''; },
      error: (err) => { this.errorCuenta = err.error?.mensaje || 'No se pudo conectar con Instagram.'; }
    });
  }

  private cargarPublicaciones() {
    this.instagramService.obtenerPublicaciones().subscribe({
      next: (publicaciones) => {
        const habiaPendientes = this.publicaciones.some(p => p.estado === 'publicando');
        this.publicaciones = publicaciones;
        this.cargando = false;
        const hayPendientes = publicaciones.some(p => p.estado === 'publicando');
        if (habiaPendientes && !hayPendientes) this.cargarCuenta();
        if (hayPendientes) {
          this.programarRefresco();
        } else {
          clearInterval(this.refresco);
          this.refresco = undefined;
        }
      },
      error: () => { this.cargando = false; }
    });
  }

  // Mientras algo se esté publicando, revisa su estado cada 5 s
  private programarRefresco() {
    if (this.refresco) return;
    this.refresco = setInterval(() => this.cargarPublicaciones(), 5000);
  }
}
