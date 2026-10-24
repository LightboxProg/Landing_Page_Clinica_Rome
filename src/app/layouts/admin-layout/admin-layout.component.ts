import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminNavbarComponent } from './admin-navbar/admin-navbar.component';
import { TemaService } from '../../services/tema/tema.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminNavbarComponent],
  templateUrl: './admin-layout.component.html',
  styles: [`
    .admin-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: var(--adm-fondo);
      transition: background-color 0.2s;
    }
    .admin-content {
      flex: 1;
      width: 100%;
    }
    /* La barra inferior del celular no debe tapar el final de la página */
    @media (max-width: 768px) {
      .admin-content { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
    }
  `]
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  constructor(private temaService: TemaService) {}

  ngOnInit(): void {
    this.temaService.aplicar();
  }

  ngOnDestroy(): void {
    this.temaService.quitar();
  }
}
