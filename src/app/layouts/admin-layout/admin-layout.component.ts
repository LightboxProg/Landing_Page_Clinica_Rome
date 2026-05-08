import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styles: [`
    .admin-wrapper {
      display: flex;
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
