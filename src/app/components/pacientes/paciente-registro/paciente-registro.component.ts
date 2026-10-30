import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PacientesService } from '../../../services/pacientes/pacientes.service';
import { SwalService } from '../../../services/swal/swal.service';
import { CommonModule } from '@angular/common';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

@Component({
  selector: 'app-paciente-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './paciente-registro.component.html',
  styleUrl: './paciente-registro.component.scss'
})
export class PacienteRegistroComponent implements OnInit {
  registerForm!: FormGroup;
  countries: { name: string; dialCode: string }[] = [];

  constructor(
    private fb: FormBuilder,
    private pacientesService: PacientesService,
    private swal: SwalService
  ) {}

  ngOnInit(): void {
    this.loadCountries();
    this.registerForm = this.fb.group({
      nombre: ['', Validators.required],
      apeP: ['', Validators.required],
      apeM: ['', Validators.required],
      apodo: ['', Validators.required],
      correoElectronico: ['', [Validators.required, Validators.email]],
      codigoPais: ['+52'],
      telefono: ['', Validators.required],
      genero: ['H', Validators.required],
      fechaNac: ['', Validators.required],
      altura: [''],
      peso: [''],
      direccion: [''],
      // Padre, madre o tutor: sus validaciones se activan sólo si el paciente es menor
      tutor: this.fb.group({
        nombre: [''],
        apeP: [''],
        apeM: [''],
        parentesco: [''],
        telefono: [''],
        correoElectronico: ['', Validators.email]
      })
    });
    this.registerForm.get('fechaNac')?.valueChanges.subscribe(() => this.actualizarTutor());
  }

  // Años cumplidos a hoy según "YYYY-MM-DD"; null si no hay fecha
  get edadPaciente(): number | null {
    const [y, m, d] = String(this.registerForm?.get('fechaNac')?.value || '').split('-').map(Number);
    if (!y || !m || !d) return null;
    const hoy = new Date();
    let edad = hoy.getFullYear() - y;
    if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
    return edad;
  }

  get esMenor(): boolean {
    const edad = this.edadPaciente;
    return edad !== null && edad >= 0 && edad < 18;
  }

  private actualizarTutor(): void {
    const tutor = this.registerForm.get('tutor') as FormGroup;
    const requeridos: Record<string, any[]> = {
      nombre: [Validators.required],
      apeP: [Validators.required],
      parentesco: [Validators.required],
      telefono: [Validators.required, Validators.pattern(/^[0-9]{10}$/)]
    };
    for (const [campo, validadores] of Object.entries(requeridos)) {
      const control = tutor.get(campo)!;
      control.setValidators(this.esMenor ? validadores : null);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  loadCountries() {
    const countryCodes = getCountries();
    this.countries = countryCodes.map(code => ({
      name: new Intl.DisplayNames(['es'], { type: 'region' }).of(code) || code,
      dialCode: `+${getCountryCallingCode(code)}`
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  updatePhonePattern(event: any) {
    const countryCode = event.target.value;
    let phonePattern: RegExp;
    switch (countryCode) {
      case '+52': case '+1':
        phonePattern = /^[0-9]{10}$/;
        break;
      case '+34':
        phonePattern = /^[0-9]{9}$/;
        break;
      default:
        phonePattern = /^[0-9]{7,15}$/;
        break;
    }
    this.registerForm.get('telefono')?.setValidators([Validators.required, Validators.pattern(phonePattern)]);
    this.registerForm.get('telefono')?.updateValueAndValidity();
  }

  limpiarFormulario() {
    this.registerForm.reset();
    this.registerForm.get('codigoPais')?.setValue('+52');
    this.registerForm.get('genero')?.setValue('H');
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.swal.error('Formulario inválido');
      return;
    }
    const form = this.registerForm.value;
    const telefonoCompleto = form.codigoPais + form.telefono;
    const nuevoPaciente = {
      nombre: form.nombre,
      apeP: form.apeP,
      apeM: form.apeM,
      apodo: form.apodo,
      telefonoPaciente: telefonoCompleto,
      telefonoWhatsapp: telefonoCompleto,
      correoElectronico: form.correoElectronico,
      genero: form.genero,
      fechaNac: form.fechaNac,
      altura: form.altura,
      peso: form.peso,
      direccion: form.direccion,
      enListaNegra: false,
      finado: false,
      ...(this.esMenor ? { tutor: form.tutor } : {})
    };
    this.pacientesService.crearPaciente(nuevoPaciente).subscribe({
      next: () => {
        this.swal.success('Paciente registrado');
        this.limpiarFormulario();
        this.pacientesService.obtenerPacientes(); // refrescar lista
      },
      error: (err) => this.swal.error(err.error?.mensaje || 'No se pudo registrar al paciente.', 'Error al registrar')
    });
  }
}