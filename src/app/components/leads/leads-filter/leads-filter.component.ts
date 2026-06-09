import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-leads-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './leads-filter.component.html',
  styleUrl: './leads-filter.component.scss'
})
export class LeadsFilterComponent {
  @Output() filterChange = new EventEmitter<any>();

  criteria = {
    search: '',
    estado: '',
    origen: ''
  };

  emitFilter() {
    this.filterChange.emit(this.criteria);
  }
}
