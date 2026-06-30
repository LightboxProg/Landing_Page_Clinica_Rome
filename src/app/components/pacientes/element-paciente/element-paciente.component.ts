import { Component, Input, OnInit } from '@angular/core';
import { Paciente, PacientesService } from '../../../services/pacientes/pacientes.service';
import { Router } from '@angular/router';
import { ListaNegraService } from '../../../services/lista-negra/lista-negra.service';
import { AuthService } from '../../../services/auth/auth.service';
import { SwalService } from '../../../services/swal/swal.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../modal/modal.component';

@Component({
  selector: 'app-element-paciente',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './element-paciente.component.html',
  styleUrl: './element-paciente.component.scss'
})
export class ElementPacienteComponent implements OnInit {
  @Input() paciente!: Paciente;
  showListaNegraModal = false;
  razon = '';
  detalles = '';
  tipo = 'permanente';
  categoria = 'Otro';
  nivelGravedad = 1;
  pacientesEnListaNegra: string[] = [];
  usuarioActual: any;

  constructor(
    private router: Router,
    private listaNegraService: ListaNegraService,
    private pacientesService: PacientesService,
    private authService: AuthService,
    private swal: SwalService
  ) { }

  ngOnInit() {
    this.usuarioActual = this.authService.getUsuario(); // Corregido
    this.cargarListaNegraIds();
  }


  cargarListaNegraIds() {
    this.listaNegraService.obtenerTodas().subscribe({
      next: (res: any) => {
        console.log('Respuesta lista negra:', res);
        let lista = Array.isArray(res) ? res : (res?.data || []);
        this.pacientesEnListaNegra = lista
          .filter((item: any) => item && item.paciente) 
          .map((item: any) => {
    
            const pacienteId = typeof item.paciente === 'string'
              ? item.paciente
              : item.paciente?._id;
            return pacienteId;
          })
          .filter((id: string) => id); // eliminar undefined
      },
      error: (err) => {
        console.error('Error al cargar lista negra:', err);
        this.pacientesEnListaNegra = [];
      }
    });
  }

  estaEnListaNegra(): boolean {
    return this.pacientesEnListaNegra.includes(this.paciente._id!);
  }

  abrirListaNegra() {
    this.showListaNegraModal = true;
    this.razon = '';
    this.detalles = '';
    this.tipo = 'permanente';
    this.categoria = 'Otro';
    this.nivelGravedad = 1;
  }

  onCloseListaNegraModal() {
    this.showListaNegraModal = false;
  }

  agregarListaNegra() {
    if (!this.razon.trim()) {
      this.swal.warning('Debes ingresar una razón');
      return;
    }
    const data = {
      pacienteId: this.paciente._id!,
      razon: this.razon,
      detalles: this.detalles,
      tipo: this.tipo,
      agregadoPor: this.usuarioActual?.id,
      categoria: this.categoria,
      nivelGravedad: this.nivelGravedad
    };
    this.listaNegraService.agregarPaciente(data).subscribe({
      next: () => {
        this.swal.success('Paciente agregado a lista negra');
        this.showListaNegraModal = false;
        this.cargarListaNegraIds();
        this.pacientesService.obtenerPacientes(); // refrescar
      },
      error: (err) => {
        if (err.status === 400 && err.error?.error === 'Paciente ya está en lista negra')
          this.swal.warning('El paciente ya está en lista negra');
        else
          this.swal.error('Error al agregar');
      }
    });
  }

  verPerfil() {
    this.router.navigate(['/admin/pacientes/perfil', this.paciente._id]);
  }

  /**
   * Formatea la fecha en formato dd/mm/yyyy. Retorna vacío si no es válida.
   */
  formatearFecha(fecha?: string | Date | null): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
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