import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserService, Usuario } from '../../../services/user/user.service';
import { AuthService } from '../../../services/auth/auth.service';
import { SwalService } from '../../../services/swal/swal.service';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';
import { UserModalComponent } from '../user-modal/user-modal.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UserModalComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})


export class UserListComponent implements OnInit {
  @ViewChild('userModal') userModal!: UserModalComponent; // Referencia al modal

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  currentUser: any;

  // Filtros
  filtroTexto: string = '';
  filtroTipo: string = '';
  filtroAtencion: string = '';

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private swal: SwalService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUsuario();
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.userService.getUsuarios().subscribe({
      next: (data) => {
        this.usuarios = data;
        this.aplicarFiltros(); // Aplicar filtros después de cargar
      },
      error: () => this.swal.error('Error al cargar usuarios')
    });
  }

  aplicarFiltros(): void {
    this.usuariosFiltrados = this.usuarios.filter(user => {
      // Filtro de texto (nombre, usuario, correo)
      const texto = this.filtroTexto.toLowerCase();
      const matchTexto = texto === '' ||
        user.nombre.toLowerCase().includes(texto) ||
        user.usuario.toLowerCase().includes(texto) ||
        user.correo.toLowerCase().includes(texto);

      // Filtro por tipo
      const matchTipo = this.filtroTipo === '' || user.tipo === this.filtroTipo;

      // Filtro por atención (solo si tipo es Doctor/Especialista y se seleccionó atención)
      let matchAtencion = true;
      if (this.filtroAtencion && (user.tipo === 'Doctor' || user.tipo === 'Especialista')) {
        matchAtencion = user.atencion === this.filtroAtencion;
      } else if (this.filtroAtencion && user.tipo !== 'Doctor' && user.tipo !== 'Especialista') {
        matchAtencion = false;
      }

      return matchTexto && matchTipo && matchAtencion;
    });
  }

  verDetalles(usuario: Usuario): void {
    if (this.userModal) {
      this.userModal.usuario = usuario;
      this.userModal.showModal = true;
    }
  }

  editarUsuario(usuario: Usuario): void {
    this.router.navigate(['/usuarios/editar', usuario._id]);
  }

  eliminarUsuario(usuario: Usuario): void {
    Swal.fire({
      title: `Eliminar a ${usuario.nombre}`,
      input: 'password',
      inputLabel: 'Ingresa tu contraseña para confirmar',
      inputPlaceholder: 'Contraseña',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      confirmButtonColor: '#d33',
      preConfirm: (password) => {
        if (!password) {
          Swal.showValidationMessage('Debes ingresar tu contraseña');
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

  getRoleClass(tipo: string): string {
    switch (tipo) {
      case 'Administrador': return 'badge-admin';
      case 'Doctor': return 'badge-doctor';
      case 'Especialista': return 'badge-especialista';
      default: return 'badge-recepcionista';
    }
  }
}