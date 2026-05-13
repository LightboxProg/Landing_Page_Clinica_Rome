import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-navbar.component.html',
  styleUrl: './admin-navbar.component.scss'
})

export class AdminNavbarComponent implements OnInit {
  usuarioNombre: string = '';
  openGroup: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  toggleGroup(event: Event, groupName: string) {
    // Solo en pantallas pequeñas (ancho <= 768px) activamos el clic
    if (window.innerWidth <= 768) {
      event.stopPropagation();
      this.openGroup = this.openGroup === groupName ? null : groupName;
    }
  }


  ngOnInit(): void {
    const usuario = this.authService.getUsuario();
    if (usuario) {
      this.usuarioNombre = `${usuario.nombre} ${usuario.apeP}`;
    }
  }

  @HostListener('document:click', ['$event'])
  closeDropdowns(event: Event) {
    if (window.innerWidth <= 768) {
      const target = event.target as HTMLElement;
      if (!target.closest('.nav-group')) {
        this.openGroup = null;
      }
    }
  }
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}