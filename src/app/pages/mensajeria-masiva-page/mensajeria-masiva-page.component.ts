import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsappService } from '../../services/whatsapp/whatsapp.service';
import { PacientesService } from '../../services/pacientes/pacientes.service';
import { LeadsService } from '../../services/leads/leads.service';
import { WhatsappPreviewComponent } from '../../components/whatsapp/preview/preview.component';
import { TemplateConfigComponent } from '../../components/whatsapp/template-config/template-config.component';
import { ContactListComponent } from '../../components/whatsapp/contact-list/contact-list.component';
import { MultimediaGalleryComponent } from '../../components/whatsapp/multimedia-gallery/multimedia-gallery.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mensajeria-masiva-page',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    WhatsappPreviewComponent, 
    TemplateConfigComponent, 
    ContactListComponent, 
    MultimediaGalleryComponent
  ],
  templateUrl: './mensajeria-masiva-page.component.html',
  styleUrl: './mensajeria-masiva-page.component.css'
})
export class MensajeriaMasivaPageComponent implements OnInit {
  pasoActual = 1;
  nombreCampania = '';
  
  plantillas: any[] = [];
  plantillaSeleccionada: any = null;
  pacientes: any[] = [];
  leads: any[] = [];
  galeria: any[] = [];
  
  contactosSeleccionados: { id: string, tipo: 'paciente' | 'lead', nombre: string }[] = [];
  imagenSeleccionada: string | null = null;
  mapeo: any = { header: [], body: [], footer: [] };

  constructor(
    private whatsappService: WhatsappService,
    private pacientesService: PacientesService,
    private leadsService: LeadsService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.whatsappService.obtenerPlantillas().subscribe((res: any) => this.plantillas = res.data);
    this.whatsappService.obtenerGaleria().subscribe((res: any) => this.galeria = res);
    this.pacientesService.obtenerPacientes();
    this.pacientesService.pacientes$.subscribe((data: any) => this.pacientes = data);
    this.leadsService.getLeads().subscribe((data: any) => this.leads = data);
  }

  get soportaMultimedia(): boolean {
    if (!this.plantillaSeleccionada) return false;
    const header = this.plantillaSeleccionada.components.find((c: any) => c.type === 'HEADER');
    return header && (header.format === 'IMAGE' || header.format === 'VIDEO' || header.format === 'DOCUMENT');
  }

  handleTemplateChange(name: string) {
    this.plantillaSeleccionada = this.plantillas.find(p => p.name === name);
    this.generarMapeoInicial();
  }

  generarMapeoInicial() {
    this.mapeo = { header: [], body: [], footer: [] };
    if (!this.plantillaSeleccionada) return;

    this.plantillaSeleccionada.components.forEach((comp: any) => {
      const type = comp.type.toLowerCase();
      if (comp.text) {
        const matches = comp.text.match(/{{(\d+)}}/g);
        if (matches) {
          matches.forEach((match: string, index: number) => {
            this.mapeo[type].push({
              index: index + 1,
              param: 'nombreCompleto',
              valorManual: ''
            });
          });
        }
      }
    });
  }

  addContacto(contacto: any) {
    if (!this.contactosSeleccionados.find(c => c.id === contacto.id)) {
      this.contactosSeleccionados = [...this.contactosSeleccionados, contacto];
    }
  }

  removeContacto(id: string) {
    this.contactosSeleccionados = this.contactosSeleccionados.filter(c => c.id !== id);
  }

  clearContactos() {
    this.contactosSeleccionados = [];
  }

  siguientePaso() {
    if (this.pasoActual < 4) this.pasoActual++;
  }

  anteriorPaso() {
    if (this.pasoActual > 1) this.pasoActual--;
  }

  enviarCampania() {
    if (!this.plantillaSeleccionada || this.contactosSeleccionados.length === 0) {
      Swal.fire('Atención', 'Selecciona una plantilla y destinatarios primero.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Confirmar envío?',
      text: `Se enviarán mensajes a ${this.contactosSeleccionados.length} contactos.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar ahora',
      cancelButtonText: 'Revisar'
    }).then((result) => {
      if (result.isConfirmed) {
        const payload: any = {
          plantilla: this.plantillaSeleccionada.name,
          idioma: this.plantillaSeleccionada.language,
          contactos: this.contactosSeleccionados.map(c => ({ id: c.id, tipo: c.tipo })),
          mapeo: this.mapeo,
          multimedia: this.imagenSeleccionada ? { type: 'IMAGE', url: this.imagenSeleccionada } : undefined
        };

        this.whatsappService.enviarMensajesMasivos(payload).subscribe({
          next: (res: any) => {
            Swal.fire('¡Éxito!', `La campaña se ha iniciado para ${res.total} contactos.`, 'success');
            this.clearContactos();
          },
          error: (err: any) => Swal.fire('Error', 'No se pudo procesar el envío masivo.', 'error')
        });
      }
    });
  }
}
