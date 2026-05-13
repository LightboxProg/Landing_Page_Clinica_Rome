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
      direccion: ['']
    });
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
      finado: false
    };
    this.pacientesService.crearPaciente(nuevoPaciente).subscribe({
      next: () => {
        this.swal.success('Paciente registrado');
        this.limpiarFormulario();
        this.pacientesService.obtenerPacientes(); // refrescar lista
      },
      error: (err) => this.swal.error('Error al registrar', err)
    });
  }
}