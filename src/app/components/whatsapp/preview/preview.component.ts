import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-whatsapp-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './preview.component.html',
  styleUrl: './preview.component.css'
})
export class WhatsappPreviewComponent {
  @Input() plantillaSeleccionada: any = null;
  @Input() imagenSeleccionada: string | null = null;
  @Input() mapeo: any = { header: [], body: [], footer: [] };

  obtenerTextoPrevisualizacion(componentType: string): string {
    const component = this.plantillaSeleccionada?.components.find((c: any) => c.type === componentType);
    if (!component || !component.text) return '';

    let text = component.text;
    const mapeoComp = this.mapeo[componentType.toLowerCase()];

    if (mapeoComp) {
      mapeoComp.forEach((m: any) => {
        const valor = m.param === 'manual' ? (m.valorManual || `[Variable ${m.index}]`) : `[${m.param}]`;
        text = text.replace(`{{${m.index}}}`, valor);
      });
    }

    return text;
  }
}
