import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhatsappService } from '../../../services/whatsapp/whatsapp.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-multimedia-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './multimedia-gallery.component.html',
  styleUrl: './multimedia-gallery.component.css'
})
export class MultimediaGalleryComponent {
  @Input() galeria: any[] = [];
  @Input() imagenSeleccionada: string | null = null;
  @Output() onImageSelected = new EventEmitter<string>();
  @Output() onGalleryUpdate = new EventEmitter<void>();

  mostrarGaleria = false;

  constructor(private whatsappService: WhatsappService) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.whatsappService.subirImagen(file).subscribe({
        next: (res: any) => {
          this.onImageSelected.emit(res.url);
          this.onGalleryUpdate.emit();
          Swal.fire('Éxito', 'Imagen subida correctamente', 'success');
        },
        error: (err: any) => Swal.fire('Error', 'No se pudo subir la imagen', 'error')
      });
    }
  }

  seleccionarDeGaleria(url: string) {
    this.onImageSelected.emit(url);
    this.mostrarGaleria = false;
  }
}
