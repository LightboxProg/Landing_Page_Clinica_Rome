import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeadsService, Lead } from '../../services/leads/leads.service';
import { LeadsFilterComponent } from '../../components/leads/leads-filter/leads-filter.component';
import { LeadsListComponent } from '../../components/leads/leads-list/leads-list.component';
import { LeadPerfilComponent } from '../../components/leads/lead-perfil/lead-perfil.component';

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, LeadsFilterComponent, LeadsListComponent, LeadPerfilComponent],
  templateUrl: './leads.component.html',
  styleUrl: './leads.component.scss'
})
export class LeadsComponent implements OnInit {
  allLeads: Lead[] = [];
  filteredLeads: Lead[] = [];
  selectedLead: Lead | null = null;

  constructor(private leadsService: LeadsService) {}

  ngOnInit() {
    this.cargarLeads();
  }

  cargarLeads() {
    this.leadsService.getLeads().subscribe(leads => {
      this.allLeads = leads;
      this.filteredLeads = leads;
    });
  }

  onFilter(criteria: any) {
    this.filteredLeads = this.allLeads.filter(lead => {
      const matchSearch = !criteria.search || 
        lead.identificador.toLowerCase().includes(criteria.search.toLowerCase()) ||
        lead.nombre.toLowerCase().includes(criteria.search.toLowerCase());
      
      const matchEstado = !criteria.estado || lead.estado === criteria.estado;
      const matchOrigen = !criteria.origen || lead.origen === criteria.origen;

      return matchSearch && matchEstado && matchOrigen;
    });
  }

  onSelectLead(lead: Lead) {
    this.selectedLead = lead;
  }

  onUpdateLead() {
    this.cargarLeads();
    this.selectedLead = null;
  }
}
