import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserService, Usuario } from '../../../services/user/user.service';
import { AuthService } from '../../../services/auth/auth.service';
import { SwalService } from '../../../services/swal/swal.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css'
})


export class UserListComponent implements OnInit {
  usuarios: Usuario[] = [];
  currentUser: any;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private swal: SwalService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getUsuario();
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.userService.getUsuarios().subscribe({
      next: (data) => (this.usuarios = data),
      error: () => this.swal.error('Error al cargar usuarios')
    });
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