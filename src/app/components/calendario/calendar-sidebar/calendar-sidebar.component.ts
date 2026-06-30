import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario } from '../../../services/user/user.service';

@Component({
  selector: 'app-calendar-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-sidebar.component.html',
  styleUrl: './calendar-sidebar.component.css'
})
export class CalendarSidebarComponent {
  @Input() doctores: Usuario[] = [];
  @Input() doctorIdSeleccionado: string = '';
  @Output() doctorIdSeleccionadoChange = new EventEmitter<string>();
  @Output() filterChanged = new EventEmitter<void>();

  onDoctorChange(value: string) {
    this.doctorIdSeleccionadoChange.emit(value);
    this.filterChanged.emit();
  }
}
