import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { AccionBot, ConexionFlujo, Flujo, FlujosService, NodoFlujo, RamaPregunta, TipoNodo } from '../../services/flujos/flujos.service';
import { CanalCampana } from '../../services/campanas/campanas.service';
import { ServiciosService } from '../../services/servicios/servicios.service';
import { ServiciosDentalesService } from '../../services/servicios-dentales/servicios-dentales.service';
import { PromocionesService } from '../../services/promociones/promociones.service';
import { WhatsappService } from '../../services/whatsapp/whatsapp.service';

// Medidas fijas de los bloques: así las líneas se dibujan sin medir el DOM
const ANCHO = 240;
const ALTO_BASE = 96;
const ALTO_SALIDA = 28;
const REJILLA = 10;

interface Salida { clave: string; etiqueta: string; }
interface MensajeSimulado { de: 'bot' | 'yo'; accion?: AccionBot; texto?: string; }

const TIPOS: { tipo: TipoNodo; titulo: string; icono: string; ayuda: string }[] = [
  { tipo: 'mensaje', titulo: 'Mensaje', icono: 'fas fa-comment', ayuda: 'Texto, imagen o audio' },
  { tipo: 'pregunta', titulo: 'Pregunta', icono: 'fas fa-list-ul', ayuda: 'Botones; entiende texto libre' },
  { tipo: 'capturar', titulo: 'Pedir dato', icono: 'fas fa-keyboard', ayuda: 'Nombre, teléfono, correo…' },
  { tipo: 'condicion', titulo: 'Condición', icono: 'fas fa-code-branch', ayuda: 'Sí / no según un dato' },
  { tipo: 'espera', titulo: 'Esperar', icono: 'fas fa-hourglass-half', ayuda: 'Minutos, horas o días' },
  { tipo: 'agendar_pagar', titulo: 'Agendar y pagar', icono: 'fas fa-calendar-check', ayuda: 'Horario + anticipo con Stripe' },
  { tipo: 'fin', titulo: 'Fin', icono: 'fas fa-flag-checkered', ayuda: 'Vuelve el bot normal' }
];

const INTENCIONES = [
  { valor: '', etiqueta: 'Ninguna' },
  { valor: 'afirmar', etiqueta: 'Dice que sí' },
  { valor: 'negar', etiqueta: 'Dice que no' },
  { valor: 'agendar', etiqueta: 'Quiere agendar' },
  { valor: 'precios', etiqueta: 'Pregunta precios' },
  { valor: 'promociones', etiqueta: 'Pregunta promociones' },
  { valor: 'ubicacion', etiqueta: 'Pregunta ubicación' },
  { valor: 'horarios', etiqueta: 'Pregunta horarios' }
];

// Lo mismo que acepta el backend (WhatsApp manda estos formatos)
const TIPOS_ARCHIVO = ['image/jpeg', 'image/png', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/x-m4a'];
const MAX_IMAGEN = 5 * 1024 * 1024;
const MAX_AUDIO = 16 * 1024 * 1024;

const nuevoId = (prefijo = 'b') => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

@Component({
  selector: 'app-flujos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './flujos.component.html',
  styleUrl: './flujos.component.css'
})
export class FlujosComponent implements OnInit {
  @ViewChild('lienzo') lienzo?: ElementRef<HTMLDivElement>;

  readonly tipos = TIPOS;
  readonly intenciones = INTENCIONES;
  readonly ANCHO = ANCHO;
  readonly variableNombre = '{{nombre}}';
  readonly variableTratamiento = '{{tratamiento}}';
  readonly variableInfo = '{{info}}';

  vista: 'lista' | 'editor' = 'lista';
  flujos: Flujo[] = [];
  cargando = true;

  modelo!: Flujo;
  sucio = false;
  guardando = false;
  seleccionId: string | null = null;

  // Conectar: se pulsa una salida y luego el bloque destino
  conectando: { desde: string; salida: string } | null = null;
  // Bloque que está subiendo su imagen o audio, y si hay un archivo encima del lienzo
  subiendoEn: string | null = null;
  archivoEncima = false;
  archivoEnPanel = false;
  cursor = { x: 0, y: 0 };
  private arrastre: { id: string; dx: number; dy: number; movido: boolean } | null = null;

  serviciosEsteticos: { _id: string; nombre: string }[] = [];
  serviciosDentales: { _id: string; nombre: string }[] = [];
  promociones: { _id: string; nombre: string }[] = [];
  plantillas: { nombre: string; idioma: string }[] = [];

  simulador = {
    abierto: false,
    canal: 'WhatsApp' as CanalCampana,
    estado: null as any,
    mensajes: [] as MensajeSimulado[],
    texto: '',
    terminado: false,
    cargando: false
  };

  constructor(
    private flujosService: FlujosService,
    private serviciosService: ServiciosService,
    private serviciosDentalesService: ServiciosDentalesService,
    private promocionesService: PromocionesService,
    private whatsappService: WhatsappService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.cargarFlujos();
    this.cargarCatalogos();
  }

  // ── Lista ──

  cargarFlujos() {
    this.cargando = true;
    this.flujosService.obtenerFlujos().subscribe({
      next: (flujos) => {
        this.flujos = flujos;
        this.cargando = false;
        const id = this.route.snapshot.queryParamMap.get('flujo');
        const abrir = id && flujos.find(f => f._id === id);
        if (abrir && this.vista === 'lista') this.editar(abrir);
      },
      error: () => {
        this.flujos = [];
        this.cargando = false;
      }
    });
  }

  private cargarCatalogos() {
    const nombres = (lista: any) => (Array.isArray(lista) ? lista : lista?.servicios || [])
      .filter((s: any) => s.activo !== false)
      .map((s: any) => ({ _id: s._id, nombre: s.nombre }));
    this.serviciosService.obtenerServicios().subscribe({ next: (r) => this.serviciosEsteticos = nombres(r), error: () => {} });
    this.serviciosDentalesService.obtenerServicios().subscribe({ next: (r) => this.serviciosDentales = nombres(r), error: () => {} });
    this.promocionesService.obtenerPromociones().subscribe({
      next: (promos) => this.promociones = promos
        .filter(p => new Date(p.fechaFin).getTime() >= Date.now())
        .map(p => ({ _id: p._id!, nombre: p.nombre })),
      error: () => {}
    });
    this.whatsappService.obtenerPlantillas().subscribe({
      next: (r: any) => this.plantillas = (r?.data || [])
        .filter((p: any) => p.status === 'APPROVED')
        .map((p: any) => ({ nombre: p.name, idioma: p.language })),
      error: () => {}
    });
  }

  nuevo() {
    this.abrirEditor(this.plantillaInicial());
  }

  editar(flujo: Flujo) {
    this.abrirEditor(JSON.parse(JSON.stringify(flujo)));
  }

  private abrirEditor(flujo: Flujo) {
    this.modelo = flujo;
    this.seleccionId = null;
    this.conectando = null;
    this.sucio = !flujo._id;
    this.cerrarSimulador();
    this.vista = 'editor';
  }

  volver() {
    if (this.sucio) {
      Swal.fire({
        title: '¿Salir sin guardar?',
        text: 'Perderás los cambios de este flujo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Salir',
        cancelButtonText: 'Seguir editando'
      }).then(r => { if (r.isConfirmed) this.irALista(); });
      return;
    }
    this.irALista();
  }

  private irALista() {
    this.vista = 'lista';
    this.cerrarSimulador();
    this.cargarFlujos();
  }

  eliminar(flujo: Flujo) {
    Swal.fire({
      title: `¿Eliminar "${flujo.nombre}"?`,
      text: 'No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then(r => {
      if (!r.isConfirmed) return;
      this.flujosService.eliminarFlujo(flujo._id!).subscribe({
        next: () => this.cargarFlujos(),
        error: (err) => Swal.fire('No se pudo eliminar', err.error?.message || 'Intenta de nuevo.', 'error')
      });
    });
  }

  nombresCampanas(flujo: Flujo): string {
    return (flujo.campanas || []).map(c => c.nombre).join(', ');
  }

  // La plantilla se manda en su idioma aprobado
  elegirPlantilla(nodo: NodoFlujo, nombre: string) {
    nodo.datos.idiomaPlantilla = this.plantillas.find(p => p.nombre === nombre)?.idioma || 'es_MX';
    this.marcarCambio();
  }

  contarBloques(flujo: Flujo): number {
    return flujo.nodos?.length || 0;
  }

  // Punto de partida que ya funciona: mensaje → ¿agendo? → agendar y pagar
  private plantillaInicial(): Flujo {
    return {
      nombre: 'Nuevo flujo',
      descripcion: '',
      canales: [],
      estado: 'Borrador',
      nodoInicio: 'n1',
      nodos: [
        { id: 'n1', tipo: 'mensaje', posicion: { x: 40, y: 60 }, datos: { texto: 'Hola {{nombre}} 👋 Gracias por escribir por la promo. Te cuento los detalles…', mediaUrl: '', mediaTipo: 'imagen' } },
        { id: 'n2', tipo: 'pregunta', posicion: { x: 340, y: 60 }, datos: { texto: '¿Quieres que te aparte un lugar?', ramas: [
          { id: 'si', etiqueta: 'Sí, quiero', intencion: 'afirmar', ejemplos: ['me interesa', 'quiero agendar', 'claro'] },
          { id: 'no', etiqueta: 'Ahora no', intencion: 'negar', ejemplos: ['luego', 'despues', 'solo veia'] }
        ] } },
        { id: 'n3', tipo: 'agendar_pagar', posicion: { x: 660, y: 20 }, datos: { servicioId: '', servicioModel: 'ServicioEstetico', promocionId: '' } },
        { id: 'n4', tipo: 'mensaje', posicion: { x: 960, y: 20 }, datos: { texto: '¡Listo! Te esperamos 💛', mediaUrl: '', mediaTipo: 'imagen' } },
        { id: 'n5', tipo: 'mensaje', posicion: { x: 660, y: 240 }, datos: { texto: 'Va, aquí estoy cuando quieras. Escribe AGENDAR en cualquier momento.', mediaUrl: '', mediaTipo: 'imagen' } }
      ],
      conexiones: [
        { desde: 'n1', salida: 'siguiente', hacia: 'n2' },
        { desde: 'n2', salida: 'si', hacia: 'n3' },
        { desde: 'n2', salida: 'no', hacia: 'n5' },
        { desde: 'n3', salida: 'pagado', hacia: 'n4' }
      ]
    };
  }

  // ── Bloques ──

  infoTipo(tipo: TipoNodo) {
    return TIPOS.find(t => t.tipo === tipo)!;
  }

  salidas(nodo: NodoFlujo): Salida[] {
    switch (nodo.tipo) {
      case 'mensaje': return [{ clave: 'siguiente', etiqueta: 'Después' }];
      case 'pregunta': return [
        ...(nodo.datos.ramas || []).map((r: RamaPregunta) => ({ clave: r.id, etiqueta: r.etiqueta || 'Sin texto' })),
        { clave: 'otro', etiqueta: 'No entendió' }
      ];
      case 'capturar': return [{ clave: 'ok', etiqueta: 'Dato válido' }, { clave: 'invalido', etiqueta: 'Dato inválido' }];
      case 'condicion': return [{ clave: 'si', etiqueta: 'Sí' }, { clave: 'no', etiqueta: 'No' }];
      case 'espera': return [{ clave: 'siguiente', etiqueta: 'Al terminar' }];
      case 'agendar_pagar': return [{ clave: 'pagado', etiqueta: 'Pagó' }, { clave: 'no_pago', etiqueta: 'No pagó' }];
      default: return [];
    }
  }

  resumen(nodo: NodoFlujo): string {
    const d = nodo.datos || {};
    switch (nodo.tipo) {
      case 'mensaje': return d.texto || (d.mediaUrl ? (d.mediaTipo === 'audio' ? '🎧 Audio' : '🖼️ Imagen') : 'Mensaje vacío');
      case 'pregunta': return d.texto || 'Pregunta sin texto';
      case 'capturar': return d.texto || `Pide ${d.campo}`;
      case 'condicion': return this.resumenCondicion(d);
      case 'espera': return `Espera ${d.cantidad} ${d.unidad}${d.plantilla ? ' · con plantilla' : ''}`;
      case 'agendar_pagar': return this.resumenAgenda(d);
      default: return 'Termina el flujo';
    }
  }

  private resumenCondicion(d: any): string {
    switch (d.tipo) {
      case 'es_paciente': return '¿Ya es paciente?';
      case 'canal': return `¿Escribe por ${d.valor || '…'}?`;
      case 'horario': return '¿Estamos en horario de atención?';
      case 'etiqueta': return `¿Tiene la etiqueta "${d.valor || '…'}"?`;
      default: return d.valor ? `¿"${d.campo}" contiene "${d.valor}"?` : `¿Tenemos "${d.campo || '…'}"?`;
    }
  }

  private resumenAgenda(d: any): string {
    if (d.servicioId) {
      const lista = d.servicioModel === 'ServicioDental' ? this.serviciosDentales : this.serviciosEsteticos;
      return lista.find(s => s._id === d.servicioId)?.nombre || 'Servicio elegido';
    }
    if (d.promocionId) return `Promo: ${this.promociones.find(p => p._id === d.promocionId)?.nombre || 'elegida'}`;
    return 'Lo de la campaña (o el catálogo)';
  }

  altoNodo(nodo: NodoFlujo): number {
    const n = this.salidas(nodo).length;
    return ALTO_BASE + n * ALTO_SALIDA + (n ? 8 : 0);
  }

  get seleccionado(): NodoFlujo | null {
    return this.modelo?.nodos.find(n => n.id === this.seleccionId) || null;
  }

  agregar(tipo: TipoNodo) {
    const el = this.lienzo?.nativeElement;
    const base = { x: (el?.scrollLeft || 0) + 60, y: (el?.scrollTop || 0) + 60 };
    // Que no caiga exactamente encima del último que se agregó
    const desfase = (this.modelo.nodos.length % 6) * 30;
    const nodo: NodoFlujo = {
      id: nuevoId(),
      tipo,
      posicion: { x: base.x + desfase, y: base.y + desfase },
      datos: this.datosIniciales(tipo)
    };
    this.modelo.nodos.push(nodo);
    if (!this.modelo.nodoInicio) this.modelo.nodoInicio = nodo.id;
    this.seleccionId = nodo.id;
    this.marcarCambio();
  }

  private datosIniciales(tipo: TipoNodo): any {
    switch (tipo) {
      case 'mensaje': return { texto: '', mediaUrl: '', mediaTipo: 'imagen' };
      case 'pregunta': return { texto: '', ramas: [
        { id: 'si', etiqueta: 'Sí', intencion: 'afirmar', ejemplos: [] },
        { id: 'no', etiqueta: 'No', intencion: 'negar', ejemplos: [] }
      ] };
      case 'capturar': return { texto: '¿Cómo te llamas?', campo: 'nombre', guardarComo: '', textoInvalido: '' };
      case 'condicion': return { tipo: 'es_paciente', campo: '', valor: '' };
      case 'espera': return { cantidad: 1, unidad: 'horas', plantilla: '', idiomaPlantilla: 'es_MX' };
      case 'agendar_pagar': return { servicioId: '', servicioModel: 'ServicioEstetico', promocionId: '' };
      default: return {};
    }
  }

  eliminarNodo(nodo: NodoFlujo) {
    this.modelo.nodos = this.modelo.nodos.filter(n => n.id !== nodo.id);
    this.modelo.conexiones = this.modelo.conexiones.filter(c => c.desde !== nodo.id && c.hacia !== nodo.id);
    if (this.modelo.nodoInicio === nodo.id) this.modelo.nodoInicio = this.modelo.nodos[0]?.id || '';
    if (this.seleccionId === nodo.id) this.seleccionId = null;
    this.marcarCambio();
  }

  marcarInicio(nodo: NodoFlujo) {
    this.modelo.nodoInicio = nodo.id;
    this.marcarCambio();
  }

  marcarCambio() {
    this.sucio = true;
  }

  // ── Imagen o audio arrastrado ──

  private archivoDe(evento: DragEvent): File | null {
    return evento.dataTransfer?.files?.[0] || null;
  }

  private problemaConArchivo(archivo: File): string | null {
    if (!TIPOS_ARCHIVO.includes(archivo.type)) return 'Usa una imagen JPG o PNG, o un audio MP3, M4A, AAC u OGG.';
    if (archivo.type.startsWith('image/') && archivo.size > MAX_IMAGEN) return 'La imagen pesa más de 5 MB, el máximo de WhatsApp.';
    if (archivo.size > MAX_AUDIO) return 'El audio pesa más de 16 MB, el máximo de WhatsApp.';
    return null;
  }

  // Sube el archivo y lo pone en el bloque de mensaje
  subirArchivo(nodo: NodoFlujo, archivo: File) {
    const problema = this.problemaConArchivo(archivo);
    if (problema) {
      Swal.fire('Archivo no compatible', problema, 'warning');
      return;
    }
    this.subiendoEn = nodo.id;
    this.flujosService.subirMedia(archivo).subscribe({
      next: ({ url, mediaTipo }) => {
        nodo.datos.mediaUrl = url;
        nodo.datos.mediaTipo = mediaTipo;
        this.subiendoEn = null;
        this.marcarCambio();
      },
      error: (err) => {
        this.subiendoEn = null;
        Swal.fire('No se pudo subir', err.error?.message || 'Intenta de nuevo.', 'error');
      }
    });
  }

  elegirArchivo(nodo: NodoFlujo, evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (archivo) this.subirArchivo(nodo, archivo);
    input.value = '';
  }

  quitarMedia(nodo: NodoFlujo) {
    nodo.datos.mediaUrl = '';
    this.marcarCambio();
  }

  // Hay que cancelar dragover para que el navegador permita soltar (y no abra el archivo)
  sobreLienzo(evento: DragEvent) {
    if (!evento.dataTransfer?.types?.includes('Files')) return;
    evento.preventDefault();
    this.archivoEncima = true;
  }

  sobrePanel(evento: DragEvent) {
    if (!evento.dataTransfer?.types?.includes('Files')) return;
    evento.preventDefault();
    this.archivoEnPanel = true;
  }

  dejarLienzo(evento: DragEvent) {
    if (evento.currentTarget === evento.target) this.archivoEncima = false;
  }

  // Soltado sobre un bloque de mensaje: le cambia la imagen o el audio
  soltarEnNodo(nodo: NodoFlujo, evento: DragEvent) {
    this.archivoEncima = false;
    const archivo = this.archivoDe(evento);
    if (!archivo || nodo.tipo !== 'mensaje') return;
    evento.preventDefault();
    evento.stopPropagation();
    this.seleccionId = nodo.id;
    this.subirArchivo(nodo, archivo);
  }

  // Soltado en el lienzo vacío: crea un bloque de mensaje ahí mismo con el archivo
  soltarEnLienzo(evento: DragEvent) {
    this.archivoEncima = false;
    const archivo = this.archivoDe(evento);
    if (!archivo || !this.lienzo) return;
    evento.preventDefault();
    const problema = this.problemaConArchivo(archivo);
    if (problema) {
      Swal.fire('Archivo no compatible', problema, 'warning');
      return;
    }
    const el = this.lienzo.nativeElement;
    const rect = el.getBoundingClientRect();
    const nodo: NodoFlujo = {
      id: nuevoId(),
      tipo: 'mensaje',
      posicion: {
        x: Math.max(0, Math.round((evento.clientX - rect.left + el.scrollLeft - ANCHO / 2) / REJILLA) * REJILLA),
        y: Math.max(0, Math.round((evento.clientY - rect.top + el.scrollTop - 20) / REJILLA) * REJILLA)
      },
      datos: this.datosIniciales('mensaje')
    };
    this.modelo.nodos.push(nodo);
    if (!this.modelo.nodoInicio) this.modelo.nodoInicio = nodo.id;
    this.seleccionId = nodo.id;
    this.subirArchivo(nodo, archivo);
  }

  // ── Ramas de una pregunta ──

  agregarRama(nodo: NodoFlujo) {
    const ramas: RamaPregunta[] = nodo.datos.ramas;
    if (ramas.length >= 10) return;
    let n = ramas.length + 1;
    while (ramas.some(r => r.id === `r${n}`)) n++;
    ramas.push({ id: `r${n}`, etiqueta: '', intencion: '', ejemplos: [] });
    this.marcarCambio();
  }

  quitarRama(nodo: NodoFlujo, rama: RamaPregunta) {
    nodo.datos.ramas = nodo.datos.ramas.filter((r: RamaPregunta) => r !== rama);
    this.modelo.conexiones = this.modelo.conexiones.filter(c => !(c.desde === nodo.id && c.salida === rama.id));
    this.marcarCambio();
  }

  ejemplosTexto(rama: RamaPregunta): string {
    return (rama.ejemplos || []).join(', ');
  }

  fijarEjemplos(rama: RamaPregunta, texto: string) {
    rama.ejemplos = texto.split(',').map(e => e.trim()).filter(Boolean);
    this.marcarCambio();
  }

  // ── Conexiones ──

  conexionDe(nodo: NodoFlujo, salida: string): ConexionFlujo | undefined {
    return this.modelo.conexiones.find(c => c.desde === nodo.id && c.salida === salida);
  }

  puertoSalida(nodo: NodoFlujo, indice: number) {
    return { x: nodo.posicion.x + ANCHO, y: nodo.posicion.y + ALTO_BASE + indice * ALTO_SALIDA + ALTO_SALIDA / 2 };
  }

  puertoEntrada(nodo: NodoFlujo) {
    return { x: nodo.posicion.x, y: nodo.posicion.y + 22 };
  }

  curva(a: { x: number; y: number }, b: { x: number; y: number }): string {
    const tiro = Math.max(50, Math.abs(b.x - a.x) / 2);
    return `M ${a.x} ${a.y} C ${a.x + tiro} ${a.y}, ${b.x - tiro} ${b.y}, ${b.x} ${b.y}`;
  }

  get lineas(): { conexion: ConexionFlujo; d: string }[] {
    const porId = new Map(this.modelo.nodos.map(n => [n.id, n]));
    const lineas: { conexion: ConexionFlujo; d: string }[] = [];
    for (const conexion of this.modelo.conexiones) {
      const origen = porId.get(conexion.desde);
      const destino = porId.get(conexion.hacia);
      if (!origen || !destino) continue;
      const indice = this.salidas(origen).findIndex(s => s.clave === conexion.salida);
      if (indice === -1) continue;
      lineas.push({ conexion, d: this.curva(this.puertoSalida(origen, indice), this.puertoEntrada(destino)) });
    }
    return lineas;
  }

  get lineaTemporal(): string | null {
    if (!this.conectando) return null;
    const origen = this.modelo.nodos.find(n => n.id === this.conectando!.desde);
    if (!origen) return null;
    const indice = this.salidas(origen).findIndex(s => s.clave === this.conectando!.salida);
    return this.curva(this.puertoSalida(origen, indice), this.cursor);
  }

  empezarConexion(nodo: NodoFlujo, salida: string, evento: Event) {
    evento.stopPropagation();
    this.conectando = { desde: nodo.id, salida };
  }

  // Clic en un bloque: termina una conexión pendiente o lo selecciona
  clicNodo(nodo: NodoFlujo, evento: Event) {
    evento.stopPropagation();
    if (this.arrastre?.movido) return;
    if (this.conectando) {
      if (this.conectando.desde !== nodo.id) {
        const { desde, salida } = this.conectando;
        this.modelo.conexiones = this.modelo.conexiones.filter(c => !(c.desde === desde && c.salida === salida));
        this.modelo.conexiones.push({ desde, salida, hacia: nodo.id });
        this.marcarCambio();
      }
      this.conectando = null;
      return;
    }
    this.seleccionId = nodo.id;
  }

  quitarConexion(conexion: ConexionFlujo, evento: Event) {
    evento.stopPropagation();
    this.modelo.conexiones = this.modelo.conexiones.filter(c => c !== conexion);
    this.marcarCambio();
  }

  clicLienzo() {
    this.conectando = null;
    this.seleccionId = null;
  }

  // ── Arrastre ──

  private puntoEnLienzo(evento: PointerEvent) {
    const el = this.lienzo!.nativeElement;
    const rect = el.getBoundingClientRect();
    return { x: evento.clientX - rect.left + el.scrollLeft, y: evento.clientY - rect.top + el.scrollTop };
  }

  empezarArrastre(nodo: NodoFlujo, evento: PointerEvent) {
    if (evento.button !== 0) return;
    const punto = this.puntoEnLienzo(evento);
    this.arrastre = { id: nodo.id, dx: punto.x - nodo.posicion.x, dy: punto.y - nodo.posicion.y, movido: false };
  }

  @HostListener('document:pointermove', ['$event'])
  moverPuntero(evento: PointerEvent) {
    if (!this.lienzo || this.vista !== 'editor') return;
    const punto = this.puntoEnLienzo(evento);
    this.cursor = punto;
    if (!this.arrastre) return;

    const nodo = this.modelo.nodos.find(n => n.id === this.arrastre!.id);
    if (!nodo) return;
    const x = Math.max(0, Math.round((punto.x - this.arrastre.dx) / REJILLA) * REJILLA);
    const y = Math.max(0, Math.round((punto.y - this.arrastre.dy) / REJILLA) * REJILLA);
    if (x !== nodo.posicion.x || y !== nodo.posicion.y) {
      nodo.posicion = { x, y };
      this.arrastre.movido = true;
      this.sucio = true;
    }
  }

  @HostListener('document:pointerup')
  soltar() {
    // El click que sigue al pointerup todavía debe saber si hubo arrastre
    setTimeout(() => this.arrastre = null);
  }

  @HostListener('document:keydown.escape')
  cancelar() {
    this.conectando = null;
  }

  get tamanoArea() {
    const nodos = this.modelo?.nodos || [];
    const ancho = Math.max(1600, ...nodos.map(n => n.posicion.x + ANCHO + 400));
    const alto = Math.max(1000, ...nodos.map(n => n.posicion.y + this.altoNodo(n) + 300));
    return { ancho, alto };
  }

  // ── Guardar ──

  alternarCanal(canal: CanalCampana) {
    const canales = this.modelo.canales;
    this.modelo.canales = canales.includes(canal) ? canales.filter(c => c !== canal) : [...canales, canal];
    this.marcarCambio();
  }

  guardar() {
    if (!this.modelo.nombre.trim()) {
      Swal.fire('Falta el nombre', 'Ponle un nombre al flujo.', 'warning');
      return;
    }
    const { _id, campanas, updatedAt, ...datos } = this.modelo as any;
    this.guardando = true;
    const peticion = _id
      ? this.flujosService.actualizarFlujo(_id, datos)
      : this.flujosService.crearFlujo(datos);

    peticion.subscribe({
      next: (guardado) => {
        this.guardando = false;
        this.modelo._id = guardado._id;
        this.sucio = false;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Flujo guardado', showConfirmButton: false, timer: 1800 });
      },
      error: (err) => {
        this.guardando = false;
        Swal.fire('No se pudo guardar', err.error?.message || 'Intenta de nuevo.', 'error');
      }
    });
  }

  // ── Simulador ──

  abrirSimulador() {
    this.simulador.abierto = true;
    this.reiniciarSimulacion();
  }

  cerrarSimulador() {
    this.simulador.abierto = false;
    this.simulador.mensajes = [];
    this.simulador.estado = null;
  }

  reiniciarSimulacion() {
    this.simulador.mensajes = [];
    this.simulador.estado = null;
    this.simulador.terminado = false;
    this.turno();
  }

  enviarSimulado(texto = this.simulador.texto, opcionId: string | null = null) {
    if (!texto.trim() || this.simulador.cargando) return;
    this.simulador.mensajes.push({ de: 'yo', texto });
    this.simulador.texto = '';
    this.turno(texto, opcionId);
  }

  private turno(texto = '', opcionId: string | null = null) {
    const { _id, campanas, updatedAt, ...flujo } = this.modelo as any;
    this.simulador.cargando = true;
    this.flujosService.simular({ flujo, canal: this.simulador.canal, estado: this.simulador.estado, texto, opcionId }).subscribe({
      next: (r) => {
        this.simulador.cargando = false;
        this.simulador.estado = r.estado;
        this.simulador.terminado = r.terminado;
        for (const accion of r.acciones) this.simulador.mensajes.push({ de: 'bot', accion });
        this.seleccionId = r.terminado ? null : r.estado?.flujoNodoId || null;
        setTimeout(() => document.querySelector('.fl-sim__chat')?.scrollTo({ top: 1e6, behavior: 'smooth' }));
      },
      error: (err) => {
        this.simulador.cargando = false;
        this.simulador.mensajes.push({ de: 'bot', accion: { tipo: 'texto', texto: `⚠️ ${err.error?.message || 'No se pudo simular.'}` } });
      }
    });
  }

  vistaPrevia(texto: string): string {
    return (texto || '')
      .replace(/\{\{\s*nombre\s*\}\}/gi, 'María')
      .replace(/\{\{\s*tratamiento\s*\}\}/gi, 'Botox');
  }

  trackId(_: number, item: { id: string }) {
    return item.id;
  }
}
