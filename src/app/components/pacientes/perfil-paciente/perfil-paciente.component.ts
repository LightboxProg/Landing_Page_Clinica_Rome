import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Paciente, PacientesService } from '../../../services/pacientes/pacientes.service';
import { CitaPayload, CitasService, MetodoPago } from '../../../services/citas/citas.service';
import { CategoriasService } from '../../../services/categorias/categorias.service';
import { ServiciosService } from '../../../services/servicios/servicios.service';
import { CategoriasDentalesService } from '../../../services/categorias-dentales/categorias-dentales.service';
import { ServiciosDentalesService } from '../../../services/servicios-dentales/servicios-dentales.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ListaNegraService } from '../../../services/lista-negra/lista-negra.service';
import { SwalService } from '../../../services/swal/swal.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ModalComponent } from '../../modal/modal.component';
import { UserService, Usuario } from '../../../services/user/user.service';
import { MembresiasService } from '../../../services/membresias/membresias.service';
import { FotosService } from '../../../services/fotos/fotos.service';
import { CalendarEventModalComponent } from '../../calendario/calendar-event-modal/calendar-event-modal.component';

@Component({
  selector: 'app-perfil-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, CalendarEventModalComponent],
  templateUrl: './perfil-paciente.component.html',
  styleUrl: './perfil-paciente.component.css'
})
export class PerfilPacienteComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  paciente: Paciente | null = null;
  editando = false;
  listaNegra: any = null;
  esAdmin = false;
  puedeVender = false;

  isModalOpen = false;
  selectedEvent: any = null;

  citasEstetica: any[] = [];
  citasDental: any[] = [];
  doctoresMap: { [key: string]: string } = {};

  // ---- Registro de citas -------------------------------------------------
  showModalCita = false;
  citaTipo: 'Estetica' | 'Dental' = 'Estetica';
  guardandoCita = false;

  doctores: Usuario[] = [];
  categoriasEstetica: any[] = [];
  serviciosEstetica: any[] = [];
  categoriasDental: any[] = [];
  serviciosDental: any[] = [];

  citaForm = this.formularioVacio();

  fotos: any[] = [];
  imagenModal: string | null = null;
  zoomScale = 1;
  zoomTranslateX = 0;
  zoomTranslateY = 0;
  isDraggingZoom = false;
  startX = 0;
  startY = 0;
  tabActivo: 'info' | 'alergias' | 'citas' | 'galeria' | 'membresias' = 'citas';
  membresias: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pacientesService: PacientesService,
    private citasService: CitasService,
    private listaNegraService: ListaNegraService,
    private fotosService: FotosService,
    private authService: AuthService,
    private swal: SwalService,
    private usuariosService: UserService,
    private membresiasService: MembresiasService,
    private categoriasService: CategoriasService,
    private serviciosService: ServiciosService,
    private categoriasDentalesService: CategoriasDentalesService,
    private serviciosDentalesService: ServiciosDentalesService
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarPaciente(id);
      this.cargarListaNegra(id);
      this.cargarCitas(id);
      this.cargarFotos(id);
      this.cargarDoctores();
      this.cargarMembresias(id);
      this.cargarCatalogos();
    }
    const usuario = this.authService.getUsuario();
    this.esAdmin = usuario?.tipo === 'Administrador';
    this.puedeVender = usuario?.tipo === 'Administrador' || usuario?.tipo === 'Recepcionista';
  }

  cargarPaciente(id: string) {
    this.pacientesService.getPacienteById(id).subscribe(res => this.paciente = res);
  }
  cargarListaNegra(id: string) {
    this.listaNegraService.obtenerPorPaciente(id).subscribe(res => {
      if (res.enListaNegra) this.listaNegra = res.datos;
    });
  }
  cargarCitas(id: string) {
    this.citasService.obtenerCitasEsteticaPorPaciente(id).subscribe(res => this.citasEstetica = res);
    this.citasService.obtenerCitasDentalPorPaciente(id).subscribe(res => this.citasDental = res);
  }
  cargarFotos(id: string) {
    this.fotosService.obtenerFotos(id).subscribe((res: any) => this.fotos = res.fotos);
  }
  cargarMembresias(id: string) {
    this.membresiasService.obtenerMembresiasPorPaciente(id).subscribe({
      next: (res: any[]) => this.membresias = res,
      error: (err) => console.error('Error al cargar membresias:', err)
    });
  }

  cargarDoctores() {
    this.usuariosService.getUsuarios().subscribe((usuarios: Usuario[]) => {
      this.doctores = usuarios.filter((u: Usuario) => u.tipo === 'Doctor' || u.tipo === 'Especialista');
      this.doctores.forEach((d: Usuario) => {
        if (d._id) this.doctoresMap[d._id] = `${d.nombre} ${d.apeP}`;
      });
    });
  }

  // Catálogos para el selector de tratamiento del modal de registro
  cargarCatalogos() {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (res) => this.categoriasEstetica = res || [],
      error: () => this.categoriasEstetica = []
    });
    this.serviciosService.obtenerServicios().subscribe({
      next: (res) => this.serviciosEstetica = (res || []).filter((s: any) => s.activo !== false),
      error: () => this.serviciosEstetica = []
    });
    this.categoriasDentalesService.obtenerCategorias().subscribe({
      next: (res) => this.categoriasDental = res || [],
      error: () => this.categoriasDental = []
    });
    this.serviciosDentalesService.obtenerServicios().subscribe({
      next: (res) => this.serviciosDental = (res || []).filter((s: any) => s.activo !== false),
      error: () => this.serviciosDental = []
    });
  }

  // ---- Registro de citas -------------------------------------------------

  private formularioVacio() {
    return {
      categoriaId: '',
      servicioId: '',
      doctorId: '',
      fechaHoraInicio: '',
      fechaHoraFin: '',
      costoTotal: 0,
      montoAnticipo: 0,
      anticipoMetodoPago: 'Ninguno' as MetodoPago,
      notas: ''
    };
  }

  abrirRegistroCita(tipo: 'Estetica' | 'Dental') {
    this.citaTipo = tipo;
    this.citaForm = this.formularioVacio();
    this.showModalCita = true;
  }

  /** Categorías de la rama activa. */
  get categoriasActivas(): any[] {
    return this.citaTipo === 'Dental' ? this.categoriasDental : this.categoriasEstetica;
  }

  /** Tratamientos de la rama activa, filtrados por la categoría elegida. */
  get serviciosActivos(): any[] {
    const lista = this.citaTipo === 'Dental' ? this.serviciosDental : this.serviciosEstetica;
    if (!this.citaForm.categoriaId) return lista;
    return lista.filter((s: any) => {
      const cat = typeof s.categoria === 'object' ? s.categoria?._id : s.categoria;
      return String(cat) === String(this.citaForm.categoriaId);
    });
  }

  get servicioSeleccionado(): any | null {
    const lista = this.citaTipo === 'Dental' ? this.serviciosDental : this.serviciosEstetica;
    return lista.find((s: any) => String(s._id) === String(this.citaForm.servicioId)) || null;
  }

  /** Lo que quedará por cobrar el día de la visita. */
  get restaPorCobrar(): number {
    const resta = (Number(this.citaForm.costoTotal) || 0) - (Number(this.citaForm.montoAnticipo) || 0);
    return resta > 0 ? resta : 0;
  }

  get anticipoExcedeCosto(): boolean {
    const costo = Number(this.citaForm.costoTotal) || 0;
    const anticipo = Number(this.citaForm.montoAnticipo) || 0;
    return costo > 0 && anticipo > costo;
  }

  /** Al cambiar de categoría, el tratamiento elegido deja de ser válido. */
  onCategoriaChange() {
    this.citaForm.servicioId = '';
    this.citaForm.costoTotal = 0;
  }

  /** Elegir tratamiento rellena costo y calcula la hora de fin. */
  onServicioChange() {
    const servicio = this.servicioSeleccionado;
    if (!servicio) return;
    this.citaForm.costoTotal = servicio.costo ?? 0;
    this.recalcularFin();
  }

  onInicioChange() {
    this.recalcularFin();
  }

  /** Fin = inicio + duración del tratamiento (60 min si no está definida). */
  private recalcularFin() {
    const inicio = this.citaForm.fechaHoraInicio;
    if (!inicio) return;
    const minutos = Number(this.servicioSeleccionado?.duracionMinutos) || 60;
    const fin = new Date(new Date(inicio).getTime() + minutos * 60000);
    const pad = (n: number) => String(n).padStart(2, '0');
    this.citaForm.fechaHoraFin =
      `${fin.getFullYear()}-${pad(fin.getMonth() + 1)}-${pad(fin.getDate())}` +
      `T${pad(fin.getHours())}:${pad(fin.getMinutes())}`;
  }

  registrarCita() {
    if (!this.paciente?._id) {
      this.swal.error('No se encontró el expediente del paciente.');
      return;
    }
    if (!this.citaForm.servicioId) {
      this.swal.error('Elige el tratamiento que se va a realizar.');
      return;
    }
    if (!this.citaForm.doctorId) {
      this.swal.error('Elige quién atenderá la cita.');
      return;
    }
    if (!this.citaForm.fechaHoraInicio || !this.citaForm.fechaHoraFin) {
      this.swal.error('Indica la fecha y hora de la cita.');
      return;
    }
    if (this.anticipoExcedeCosto) {
      this.swal.error('El anticipo no puede ser mayor al costo del tratamiento.');
      return;
    }
    const anticipo = Number(this.citaForm.montoAnticipo) || 0;
    if (anticipo > 0 && this.citaForm.anticipoMetodoPago === 'Ninguno') {
      this.swal.error('Indica cómo se recibió el anticipo.');
      return;
    }

    const p = this.paciente;
    const payload: CitaPayload = {
      pacienteId: p._id,
      pacienteNombre: `${p.nombre} ${p.apeP} ${p.apeM || ''}`.trim(),
      pacienteTelefono: p.telefonoWhatsapp || p.telefonoPaciente || '',
      pacienteEmail: p.correoElectronico,
      doctorId: this.citaForm.doctorId,
      servicioId: this.citaForm.servicioId,
      tipoCita: this.citaTipo,
      // El backend reescribe el título con el nombre del tratamiento.
      titulo: this.servicioSeleccionado?.nombre || '',
      fechaHoraInicio: new Date(this.citaForm.fechaHoraInicio),
      fechaHoraFin: new Date(this.citaForm.fechaHoraFin),
      notas: this.citaForm.notas,
      costoTotal: Number(this.citaForm.costoTotal) || 0,
      montoAnticipo: anticipo,
      anticipoMetodoPago: anticipo > 0 ? this.citaForm.anticipoMetodoPago : 'Ninguno'
    };

    this.guardandoCita = true;
    this.citasService.agendarCita(payload).subscribe({
      next: () => {
        this.guardandoCita = false;
        this.showModalCita = false;
        this.swal.success('Cita registrada');
        if (this.paciente?._id) this.cargarCitas(this.paciente._id);
      },
      error: (err) => {
        this.guardandoCita = false;
        this.swal.error(err?.error?.message || 'No se pudo registrar la cita.');
      }
    });
  }

  guardarCambiosGenerales() {
    if (!this.paciente) return;
    this.pacientesService.actualizarPaciente(this.paciente._id!, this.paciente).subscribe({
      next: () => { this.editando = false; this.swal.success('Datos actualizados'); },
      error: () => this.swal.error('Error al actualizar')
    });
  }

  guardarAlergias() {
    if (!this.paciente) return;
    this.pacientesService.guardarAlergias(this.paciente._id!, this.paciente.alergias || '').subscribe({
      next: () => this.swal.success('Alergias guardadas'),
      error: () => this.swal.error('Error')
    });
  }
  guardarMedicamentos() {
    if (!this.paciente) return;
    this.pacientesService.guardarMedicamentos(this.paciente._id!, this.paciente.medicamentos || '').subscribe({
      next: () => this.swal.success('Medicamentos guardados'),
      error: () => this.swal.error('Error')
    });
  }

  triggerFileInput() { this.fileInput.nativeElement.click(); }
  onFileSelected(event: Event) {
    if (!this.paciente?._id) return;
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.fotosService.subirFoto(this.paciente._id, input.files[0]).subscribe({
        next: () => {
          if (this.paciente?._id) this.cargarFotos(this.paciente._id);
          this.swal.success('Foto subida');
        },
        error: () => this.swal.error('Error al subir foto')
      });
    }
  }

  eliminarDeListaNegra() {
    if (!this.paciente) return;
    this.listaNegraService.removerPaciente(this.paciente._id!).subscribe(() => {
      this.listaNegra = null;
      if (this.paciente) this.paciente.enListaNegra = false;
      this.swal.success('Removido de lista negra');
    });
  }

  calcularEdad(fecha?: string | Date | null): number {
    if (!fecha) return 0;
    const hoy = new Date();
    const nac = new Date(fecha);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  /**
   * Abre el modal de imagen ampliada y restablece el zoom.
   */
  abrirModalImagen(url: string) {
    this.imagenModal = url;
    this.reiniciarZoom();
  }

  /**
   * Cierra el modal de imagen ampliada.
   */
  cerrarModalImagen() {
    this.imagenModal = null;
  }

  /**
   * Incrementa o decrementa el nivel de zoom de la imagen.
   */
  aplicarZoom(delta: number) {
    this.zoomScale = Math.max(1, Math.min(5, this.zoomScale + delta));
    if (this.zoomScale === 1) {
      this.zoomTranslateX = 0;
      this.zoomTranslateY = 0;
    }
  }

  /**
   * Restablece el zoom y desplazamiento a sus valores iniciales.
   */
  reiniciarZoom() {
    this.zoomScale = 1;
    this.zoomTranslateX = 0;
    this.zoomTranslateY = 0;
  }

  /**
   * Controla el zoom de la imagen mediante la rueda del ratón.
   */
  onWheelZoom(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.2 : -0.2;
    this.aplicarZoom(delta);
  }

  /**
   * Inicia el proceso de arrastre para desplazar la imagen con zoom.
   */
  iniciarArrastre(event: MouseEvent) {
    if (this.zoomScale <= 1) return;
    this.isDraggingZoom = true;
    this.startX = event.clientX - this.zoomTranslateX;
    this.startY = event.clientY - this.zoomTranslateY;
  }

  /**
   * Actualiza la posición de la imagen desplazada durante el arrastre.
   */
  arrastrar(event: MouseEvent) {
    if (!this.isDraggingZoom) return;
    this.zoomTranslateX = event.clientX - this.startX;
    this.zoomTranslateY = event.clientY - this.startY;
  }

  /**
   * Finaliza el estado de arrastre de la imagen.
   */
  finalizarArrastre() {
    this.isDraggingZoom = false;
  }

  /**
   * Obtiene las iniciales del nombre y apellido paterno del paciente.
   */
  obtenerIniciales(): string {
    if (!this.paciente) return '';
    const nombre = this.paciente.nombre ? this.paciente.nombre.charAt(0) : '';
    const apeP = this.paciente.apeP ? this.paciente.apeP.charAt(0) : '';
    return (nombre + apeP).toUpperCase();
  }

  // Prepara el objeto de la cita y abre el modal de cobro interactivo
  abrirCobroCita(cita: any): void {
    if (!this.paciente) return;
    this.selectedEvent = {
      citaId: cita._id,
      pacienteNombre: `${this.paciente.nombre} ${this.paciente.apeP}`,
      medicoNombre: cita.doctorId?.nombre || this.doctoresMap[cita.doctorId?._id || cita.doctorId] || 'No asignado',
      servicioNombre: cita.titulo,
      // Sin servicioId el modal de cobro no puede consultar el precio de
      // lista y terminaba proponiendo una cifra fija.
      servicioId: cita.servicioId?._id || cita.servicioId || null,
      tipoCita: cita.tipoCita,
      pacienteTelefono: this.paciente.telefonoWhatsapp || this.paciente.telefonoPaciente || '',
      description: cita.notas || '',
      costoTotal: cita.costoTotal || 0,
      montoAnticipo: cita.montoAnticipo || 0,
      descuentoMonto: cita.descuentoMonto || 0,
      descuentoTipo: cita.descuentoTipo || 'Ninguno',
      descuentoValor: cita.descuentoValor || 0,
      promocionId: cita.promocionId?._id || cita.promocionId || null,
      promocionNombre: cita.promocionId?.nombre || null,
      pacienteId: this.paciente._id,
      montoPagadoClinica: cita.montoPagadoClinica || 0,
      metodoPago: cita.metodoPago || 'Ninguno',
      cobrado: !!cita.cobrado
    };
    this.isModalOpen = true;
  }

  // Refresca la lista de citas del paciente tras confirmar un cobro
  recargarCitas(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarCitas(id);
    }
  }
}