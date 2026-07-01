import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { UserService } from '../../services/user/user.service';
import { HorarioAtencionComponent } from '../../components/usuarios/horario-atencion/horario-atencion.component';
import { HorarioDoctorComponent } from '../../components/usuarios/horario-doctor/horario-doctor.component';

@Component({
  selector: 'app-disponibilidad-page',
  standalone: true,
  imports: [CommonModule, HorarioAtencionComponent, HorarioDoctorComponent],
  templateUrl: './disponibilidad.component.html',
  styleUrl: './disponibilidad.component.css'
})
export class DisponibilidadComponent implements OnInit {
  usuarioId: string = '';
  tipoUsuario: string = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['doctorId']) {
        this.usuarioId = params['doctorId'];
        this.cargarTipoUsuario(this.usuarioId);
      } else {
        const user = this.authService.getUsuario();
        if (user && user.id) {
          this.usuarioId = user.id;
          this.tipoUsuario = user.tipo || '';
        }
      }
    });
  }

  // Carga el tipo cuando viene por queryParam
  cargarTipoUsuario(id: string) {
    this.userService.getUsuarioById(id).subscribe(u => {
      this.tipoUsuario = u?.tipo || '';
    });
  }
}
