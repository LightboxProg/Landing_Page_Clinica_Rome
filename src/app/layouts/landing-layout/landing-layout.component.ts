import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'app-landing-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './landing-layout.component.html',
  styles: [`
    .landing-wrapper {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .landing-content {
      flex: 1;
    }
  `]
})
export class LandingLayoutComponent { }
