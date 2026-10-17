import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstagramService, MedioInstagram } from '../../../services/instagram/instagram.service';

// Cuadrícula con las publicaciones de la cuenta para elegir en cuál aplica una
// campaña de comentarios. Vacío = cualquier publicación.
@Component({
  selector: 'app-selector-publicacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './selector-publicacion.component.html',
  styleUrl: './selector-publicacion.component.css'
})
export class SelectorPublicacionComponent implements OnInit {
  @Input() publicacionId = '';
  @Output() publicacionIdChange = new EventEmitter<string>();

  medios: MedioInstagram[] = [];
  siguiente: string | null = null;
  cargando = true;
  cargandoMas = false;
  error = '';
  manual = false;

  readonly iconoTipo: Record<MedioInstagram['tipo'], string> = {
    imagen: '', carrusel: 'far fa-clone', video: 'fas fa-play', reel: 'fas fa-film'
  };

  constructor(private instagramService: InstagramService) {}

  ngOnInit() {
    this.instagramService.listarMedios().subscribe({
      next: ({ medios, siguiente }) => {
        this.medios = medios;
        this.siguiente = siguiente;
        this.cargando = false;
        this.asegurarSeleccionada();
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.mensaje || 'No se pudieron cargar las publicaciones de Instagram.';
        this.manual = true;
      }
    });
  }

  get seleccionada(): MedioInstagram | undefined {
    return this.medios.find(m => m.id === this.publicacionId);
  }

  elegir(id: string) {
    this.publicacionId = id;
    this.publicacionIdChange.emit(id);
  }

  cargarMas() {
    if (!this.siguiente || this.cargandoMas) return;
    this.cargandoMas = true;
    this.instagramService.listarMedios(this.siguiente).subscribe({
      next: ({ medios, siguiente }) => {
        const vistos = new Set(this.medios.map(m => m.id));
        this.medios = [...this.medios, ...medios.filter(m => !vistos.has(m.id))];
        this.siguiente = siguiente;
        this.cargandoMas = false;
      },
      error: () => { this.cargandoMas = false; }
    });
  }

  // Al editar una campaña vieja, su publicación puede no estar entre las recientes
  private asegurarSeleccionada() {
    if (!this.publicacionId || this.seleccionada) return;
    this.instagramService.obtenerMedio(this.publicacionId).subscribe({
      next: (medio) => { if (!this.medios.some(m => m.id === medio.id)) this.medios = [medio, ...this.medios]; },
      error: () => {}
    });
  }
}
