import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})

export class SwalService {
  success(message: string, title = 'Éxito') {
    Swal.fire(title, message, 'success');
  }

  error(message: string, title = 'Error') {
    Swal.fire(title, message, 'error');
  }

  warning(message: string, title = 'Advertencia') {
    Swal.fire(title, message, 'warning');
  }

  info(message: string, title = 'Información') {
    Swal.fire(title, message, 'info');
  }

  errorCampos(message = 'Por favor complete todos los campos requeridos') {
    this.warning(message);
  }
}