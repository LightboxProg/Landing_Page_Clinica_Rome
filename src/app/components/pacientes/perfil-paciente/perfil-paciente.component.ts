import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Paciente, PacientesService } from '../../../services/pacientes/pacientes.service';
import { CitaPayload, CitasService } from '../../../services/citas/citas.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ListaNegraService } from '../../../services/lista-negra/lista-negra.service';
import { SwalService } from '../../../services/swal/swal.service';
import { AuthService } from '../../../services/auth/auth.service';
import { ModalComponent } from '../../modal/modal.component';
import { UserService, Usuario } from '../../../services/user/user.service';
import { MembresiasService } from '../../../services/membresias/membresias.service';
import { FotosService } from '../../../services/fotos/fotos.service';

@Component({
  selector: 'app-perfil-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './perfil-paciente.component.html',
  styleUrl: './perfil-paciente.component.css'
})
export class PerfilPacienteComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  paciente: Paciente | null = null;
  editando = false;
  listaNegra: any = null;
  esAdmin = false;

  citasEstetica: any[] = [];
  citasDental: any[] = [];
  doctoresMap: { [key: string]: string } = {};
  showModalEstetica = false;
  showModalDental = false;
  nuevaCitaEstetica: Partial<CitaPayload> = { titulo: '', notas: '' };
  nuevaCitaDental: Partial<CitaPayload> = { titulo: '', notas: '' };

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
    private membresiasService: MembresiasService
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
    }
    const usuario = this.authService.getUsuario();
    this.esAdmin = usuario?.tipo === 'Administrador';
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
      const doctores = usuarios.filter((u: Usuario) => u.tipo === 'Doctor' || u.tipo === 'Especialista');
      doctores.forEach((d: Usuario) => {
        if (d._id) this.doctoresMap[d._id] = `${d.nombre} ${d.apeP}`;
      });
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

  crearCitaEstetica() {
    if (!this.paciente?._id) {
      this.swal.error('ID del paciente no disponible');
      return;
    }
    const cita: CitaPayload = {
      ...this.nuevaCitaEstetica as CitaPayload,
      pacienteId: this.paciente._id,
      pacienteNombre: `${this.paciente.nombre} ${this.paciente.apeP} ${this.paciente.apeM}`,
      pacienteTelefono: this.paciente.telefonoWhatsapp,
      pacienteEmail: this.paciente.correoElectronico,
      doctorId: this.nuevaCitaEstetica.doctorId || '',
      tipoCita: 'Estetica',
      fechaHoraInicio: new Date(this.nuevaCitaEstetica.fechaHoraInicio || new Date()),
      fechaHoraFin: new Date(this.nuevaCitaEstetica.fechaHoraFin || new Date())
    };
    this.citasService.crearCitaEstetica(cita).subscribe({
      next: () => {
        this.swal.success('Cita estética creada');
        if (this.paciente?._id) this.cargarCitas(this.paciente._id);
        this.showModalEstetica = false;
      },
      error: () => this.swal.error('Error al crear cita')
    });
  }
  crearCitaDental() {
    this.swal.warning('Función en desarrollo');
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
}