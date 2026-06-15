import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../../services/user/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SwalService } from '../../../services/swal/swal.service';
import { HorarioAtencionComponent } from '../horario-atencion/horario-atencion.component';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HorarioAtencionComponent],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.css'
})
export class UserFormComponent implements OnInit {
  form: FormGroup;
  editMode = false;
  userId: string | null = null;
  isDoctorOrSpecialist = false;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private swal: SwalService,
    private route: ActivatedRoute,
    public router: Router
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apeP: ['', Validators.required],
      apeM: [''],
      correo: ['', [Validators.required, Validators.email]],
      telefono: ['', [Validators.required, Validators.pattern('[0-9]{10}')]],
      usuario: ['', Validators.required],
      password: [''],
      tipo: ['', Validators.required],
      especialidad: [''],
      atencion: ['']
    });
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.editMode = true;
      this.cargarUsuario(this.userId);
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
    } else {
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    }

    this.form.get('tipo')?.valueChanges.subscribe(tipo => {
      this.isDoctorOrSpecialist = tipo === 'Doctor' || tipo === 'Especialista';
      const atencionCtrl = this.form.get('atencion');
      if (this.isDoctorOrSpecialist) {
        atencionCtrl?.setValidators(Validators.required);
      } else {
        atencionCtrl?.clearValidators();
        atencionCtrl?.setValue('');
      }
      atencionCtrl?.updateValueAndValidity();
    });
  }

  cargarUsuario(id: string): void {
    this.userService.getUsuarioById(id).subscribe({
      next: (user) => {
        this.form.patchValue(user);
        this.isDoctorOrSpecialist = user.tipo === 'Doctor' || user.tipo === 'Especialista';
      },
      error: () => this.swal.error('Error al cargar usuario')
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.swal.errorCampos('Revisa los datos requeridos');
      return;
    }
    const formData = { ...this.form.value };
    if (this.editMode && !formData.password) delete formData.password;

    const request = this.editMode
      ? this.userService.updateUsuario(this.userId!, formData)
      : this.userService.createUsuario(formData);

    request.subscribe({
      next: () => {
        this.swal.success(`Usuario ${this.editMode ? 'actualizado' : 'creado'} correctamente`);
        this.router.navigate(['/admin/usuarios']);
      },
      error: (err: any) => this.swal.error(err.error?.message || 'Error al guardar')
    });
  }
}
