import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-whatsapp-contact-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.css'
})
export class ContactListComponent {
  @Input() pacientes: any[] = [];
  @Input() leads: any[] = [];
  @Input() contactosSeleccionados: { id: string, tipo: 'paciente' | 'lead', nombre: string }[] = [];
  
  @Output() onAdd = new EventEmitter<{ id: string, tipo: 'paciente' | 'lead', nombre: string }>();
  @Output() onRemove = new EventEmitter<string>();
  @Output() onClear = new EventEmitter<void>();

  tabActivo: 'pacientes' | 'leads' | 'seleccion' = 'pacientes';

  filtro = '';
  mostrarFiltrosAvanzados = false;
  
  // Filtros Pacientes
  filtroGenero = '';
  filtroMesesCita = ''; // "3", "6", "12"

  // Filtros Leads
  filtroOrigen = '';
  filtroInteres = '';

  get filtradosPacientes() {
    return this.pacientes.filter(p => {
      const matchTexto = `${p.nombre} ${p.apellidoPaterno || ''}`.toLowerCase().includes(this.filtro.toLowerCase());
      const matchGenero = this.filtroGenero ? p.genero === this.filtroGenero : true;
      // Filtro simulado de cita (requiere integración con el backend de citas)
      const matchCita = true; 
      
      return matchTexto && matchGenero && matchCita;
    });
  }

  get filtradosLeads() {
    return this.leads.filter(l => {
      const matchTexto = l.nombre.toLowerCase().includes(this.filtro.toLowerCase());
      const matchOrigen = this.filtroOrigen ? l.origen === this.filtroOrigen : true;
      const matchInteres = this.filtroInteres ? l.interes === this.filtroInteres : true;
      
      return matchTexto && matchOrigen && matchInteres;
    });
  }

  isSeleccionado(id: string): boolean {
    return !!this.contactosSeleccionados.find(c => c.id === id);
  }

  toggle(item: any, tipo: 'paciente' | 'lead') {
    const nombre = tipo === 'paciente' ? `${item.nombre} ${item.apellidoPaterno || ''}` : item.nombre;
    if (this.isSeleccionado(item._id)) {
      this.onRemove.emit(item._id);
    } else {
      this.onAdd.emit({ id: item._id, tipo, nombre });
    }
  }

  addAll(tipo: 'paciente' | 'lead') {
    const lista = tipo === 'paciente' ? this.filtradosPacientes : this.filtradosLeads;
    lista.forEach(item => {
      if (!this.isSeleccionado(item._id)) {
        const nombre = tipo === 'paciente' ? `${item.nombre} ${item.apellidoPaterno || ''}` : item.nombre;
        this.onAdd.emit({ id: item._id, tipo, nombre });
      }
    });
  }
}
