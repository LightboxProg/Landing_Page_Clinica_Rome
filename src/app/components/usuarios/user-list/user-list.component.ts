import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserService, Usuario } from '../../../services/user/user.service';
import { AuthService } from '../../../services/auth/auth.service';
import { SwalService } from '../../../services/swal/swal.service';
import Swal from 'sweetalert2';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserModalComponent } from '../user-modal/user-modal.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, UserModalComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})
export class UserListComponent implements OnInit {
  @ViewChild('userModal') userModal!: UserModalComponent;

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  currentUser: any;

  filtroTexto: string = '';
  filtroTipo: string = '';
  filtroAtencion: string = '';

  showEditModal = false;
  editForm: FormGroup | null = null;
  usuarioEditando: Usuario | null = null;
  guardando = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private swal: SwalService,
    private router: Router,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUsuario();
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.userService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.aplicarFiltros();
      },
      error: () => this.swal.error('Error al cargar usuarios')
    });
  }

  aplicarFiltros(): void {
    this.usuariosFiltrados = this.usuarios.filter(user => {
      const texto = this.filtroTexto.toLowerCase();
      const matchTexto = texto === '' ||
        user.nombre.toLowerCase().includes(texto) ||
        user.usuario.toLowerCase().includes(texto) ||
        user.correo.toLowerCase().includes(texto);

      const matchTipo = this.filtroTipo === '' || user.tipo === this.filtroTipo;

      let matchAtencion = true;
      if (this.filtroAtencion && (user.tipo === 'Doctor' || user.tipo === 'Especialista')) {
        matchAtencion = user.atencion === this.filtroAtencion;
      } else if (this.filtroAtencion && user.tipo !== 'Doctor' && user.tipo !== 'Especialista') {
        matchAtencion = false;
      }

      return matchTexto && matchTipo && matchAtencion;
    });
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroTipo = '';
    this.filtroAtencion = '';
    this.aplicarFiltros();
  }

  countByTipo(tipo: string): number {
    return this.usuarios.filter(u => u.tipo === tipo).length;
  }

  getInitials(user: Usuario): string {
    const n = user.nombre?.[0] || '';
    const a = user.apeP?.[0] || '';
    return (n + a).toUpperCase();
  }

  getAvatarClass(tipo: string): string {
    switch (tipo) {
      case 'Administrador': return 'avatar-admin';
      case 'Doctor': return 'avatar-doctor';
      case 'Especialista': return 'avatar-especialista';
      default: return 'avatar-recepcionista';
    }
  }

  getRoleClass(tipo: string): string {
    switch (tipo) {
      case 'Administrador': return 'role-admin';
      case 'Doctor': return 'role-doctor';
      case 'Especialista': return 'role-especialista';
      default: return 'role-recepcionista';
    }
  }

  verDetalles(usuario: Usuario): void {
    if (this.userModal) {
      this.userModal.usuario = usuario;
      this.userModal.showModal = true;
    }
  }

  abrirModalEditar(usuario: Usuario): void {
    this.usuarioEditando = usuario;
    this.editForm = this.fb.group({
      nombre: [usuario.nombre, Validators.required],
      apeP: [usuario.apeP, Validators.required],
      apeM: [usuario.apeM || ''],
      correo: [usuario.correo, [Validators.required, Validators.email]],
      telefono: [usuario.telefono, [Validators.required, Validators.pattern('[0-9]{10}')]],
      usuario: [usuario.usuario, Validators.required],
      password: [''],
      tipo: [usuario.tipo, Validators.required],
      especialidad: [usuario.especialidad || ''],
      atencion: [usuario.atencion || ''],
      activo: [usuario.activo !== false]
    });

    this.editForm.get('tipo')?.valueChanges.subscribe(tipo => {
      const atencion = this.editForm?.get('atencion');
      if (tipo === 'Doctor') atencion?.setValue('Dental');
      else if (tipo === 'Especialista') atencion?.setValue('Estetica');
      else atencion?.setValue('');
    });

    this.showEditModal = true;
  }

  cerrarModalEditar(): void {
    this.showEditModal = false;
    this.editForm = null;
    this.usuarioEditando = null;
    this.guardando = false;
  }

  guardarEdicion(): void {
    if (!this.editForm || this.editForm.invalid || !this.usuarioEditando) return;

    this.guardando = true;
    const data = { ...this.editForm.value };
    if (!data.password) delete data.password;

    this.userService.updateUsuario(this.usuarioEditando._id!, data).subscribe({
      next: () => {
        this.swal.success('Usuario actualizado correctamente');
        this.cerrarModalEditar();
        this.cargarUsuarios();
      },
      error: (err: any) => {
        this.guardando = false;
        this.swal.error(err.error?.message || 'Error al actualizar usuario');
      }
    });
  }

  irADisponibilidad(usuario: Usuario): void {
    this.router.navigate(['/admin/disponibilidad'], { queryParams: { doctorId: usuario._id } });
  }

  eliminarUsuario(usuario: Usuario): void {
    Swal.fire({
      title: `Eliminar a ${usuario.nombre}`,
      input: 'password',
      inputLabel: 'Ingresa tu contrasena para confirmar',
      inputPlaceholder: 'Contrasena',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#d33',
      preConfirm: (password) => {
        if (!password) {
          Swal.showValidationMessage('Debes ingresar tu contrasena');
          return false;
        }
        return this.userService.deleteUsuarioWithPassword(this.currentUser, password, usuario._id!).toPromise()
          .then(() => {
            this.cargarUsuarios();
            Swal.fire('Eliminado', `Usuario ${usuario.nombre} eliminado`, 'success');
          })
          .catch((error) => {
            Swal.showValidationMessage(error.error?.message || 'Error al eliminar');
          });
      }
    });
  }
}