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

  toast(message: string, title = '', icon: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });

    Toast.fire({
      icon: icon,
      title: title || message,
      text: title ? message : ''
    });
  }

  confirm(message: string, title = '¿Estás seguro?'): Promise<any> {
    return Swal.fire({
      title,
      text: message,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1a7a4a',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    });
  }
}