import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { HorarioAtencionComponent } from '../../components/usuarios/horario-atencion/horario-atencion.component';

@Component({
  selector: 'app-disponibilidad-page',
  standalone: true,
  imports: [CommonModule, HorarioAtencionComponent],
  templateUrl: './disponibilidad.component.html',
  styleUrl: './disponibilidad.component.css'
})
export class DisponibilidadComponent implements OnInit {
  usuarioId: string = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener doctorId de los parametros de busqueda o del usuario logueado
    this.route.queryParams.subscribe(params => {
      if (params['doctorId']) {
        this.usuarioId = params['doctorId'];
      } else {
        const user = this.authService.getUsuario();
        if (user && user.id) {
          this.usuarioId = user.id;
        }
      }
    });
  }
}
