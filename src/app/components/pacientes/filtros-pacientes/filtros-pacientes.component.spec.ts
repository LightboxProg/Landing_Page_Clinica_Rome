import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltrosPacientesComponent } from './filtros-pacientes.component';

describe('FiltrosPacientesComponent', () => {
  let component: FiltrosPacientesComponent;
  let fixture: ComponentFixture<FiltrosPacientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltrosPacientesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FiltrosPacientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
