import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminNavbarComponent } from './admin-navbar/admin-navbar.component';

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
      background: var(--color-background);
    }
    .admin-content {
      flex: 1;
      width: 100%;
    }
  `]
})
export class AdminLayoutComponent { }
