import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-template-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-config.component.html',
  styleUrl: './template-config.component.css'
})
export class TemplateConfigComponent {
  @Input() plantillas: any[] = [];
  @Input() plantillaSeleccionada: any = null;
  @Input() mapeo: any = { header: [], body: [], footer: [] };
  
  @Output() onTemplateChange = new EventEmitter<string>();

  seleccionarPlantillaV2(event: any) {
    this.onTemplateChange.emit(event.target.value);
  }
}
