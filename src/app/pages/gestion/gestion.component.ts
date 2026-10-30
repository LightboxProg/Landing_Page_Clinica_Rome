import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { GestionServiciosComponent } from '../../components/servicios/gestion-servicios/gestion-servicios.component';
import { GestionCategoriasComponent } from '../../components/gestion-categorias/gestion-categorias.component';
import { GestionMembresiasComponent } from '../../components/membresias/gestion-membresias/gestion-membresias.component';
import { MembresiasAdquiridasComponent } from '../../components/membresias/membresias-adquiridas/membresias-adquiridas.component';
import { GestionServiciosDentalesComponent } from '../../components/servicios-dentales/gestion-servicios-dentales/gestion-servicios-dentales.component';
import { GestionCategoriasDentalesComponent } from '../../components/gestion-categorias-dentales/gestion-categorias-dentales.component';
import { CorteDiarioComponent } from '../../components/corte-diario/corte-diario.component';
import { GestionPromocionesComponent } from '../../components/gestion-promociones/gestion-promociones.component';
import { PagosPromoComponent } from '../../components/pagos-promo/pagos-promo.component';

type TabGestion = 'servicios' | 'serviciosDentales' | 'membresias' | 'suscripciones' | 'corteDiario' | 'pagosPromo' | 'promociones';

interface InfoTab {
  titulo: string;
  corto: string;
  descripcion: string;
  icono: string;
  grupo: 'Caja' | 'Configuración';
}

// Mismo agrupamiento que el navbar: la página sólo muestra las pestañas de su grupo
const INFO: Record<TabGestion, InfoTab> = {
  corteDiario: { titulo: 'Corte del día', corto: 'Corte del día', descripcion: 'Lo cobrado hoy en clínica y en línea, separado por área y método de pago.', icono: 'fa-receipt', grupo: 'Caja' },
  pagosPromo: { titulo: 'Pagos de promociones', corto: 'Pagos de promociones', descripcion: 'Quién pagó una promoción en la página, con su número, para agendarle por WhatsApp.', icono: 'fa-tags', grupo: 'Caja' },
  suscripciones: { titulo: 'Membresías contratadas', corto: 'Membresías contratadas', descripcion: 'Cobros automáticos, atrasos y links de pago de cada paciente.', icono: 'fa-id-card', grupo: 'Caja' },
  servicios: { titulo: 'Servicios estéticos', corto: 'Estéticos', descripcion: 'Tratamientos, precios y categorías que se muestran en la página y en el bot.', icono: 'fa-spa', grupo: 'Configuración' },
  serviciosDentales: { titulo: 'Servicios dentales', corto: 'Dentales', descripcion: 'Tratamientos dentales, precios y categorías.', icono: 'fa-tooth', grupo: 'Configuración' },
  membresias: { titulo: 'Planes de membresía', corto: 'Planes de membresía', descripcion: 'Los planes a plazos que se pueden contratar en línea o en recepción.', icono: 'fa-crown', grupo: 'Configuración' },
  promociones: { titulo: 'Promociones', corto: 'Promociones', descripcion: 'Descuentos por temporada, paquetes y límites por paciente.', icono: 'fa-percent', grupo: 'Configuración' }
};
const TABS = Object.keys(INFO) as TabGestion[];

@Component({
  selector: 'app-gestion',
  standalone: true,
  imports: [
    CommonModule, 
    GestionServiciosComponent, 
    GestionCategoriasComponent, 
    GestionMembresiasComponent, 
    MembresiasAdquiridasComponent, 
    GestionServiciosDentalesComponent, 
    GestionCategoriasDentalesComponent,
    CorteDiarioComponent,
    GestionPromocionesComponent,
    PagosPromoComponent
  ],
  templateUrl: './gestion.component.html',
  styleUrl: './gestion.component.css'
})
export class GestionComponent implements OnInit, OnDestroy {
  tabActivo: TabGestion = 'servicios';
  readonly info = INFO;
  private sub?: Subscription;

  get actual(): InfoTab {
    return INFO[this.tabActivo];
  }

  get tabsDelGrupo(): TabGestion[] {
    return TABS.filter(t => INFO[t].grupo === this.actual.grupo);
  }

  constructor(private route: ActivatedRoute, private router: Router) {}

  // La pestaña vive en la URL (?tab=) para que el menú lleve directo a ella
  ngOnInit(): void {
    this.sub = this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab') as TabGestion;
      this.tabActivo = TABS.includes(tab) ? tab : 'servicios';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  cambiarTab(tab: TabGestion): void {
    this.tabActivo = tab;
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, replaceUrl: true });
  }
}
