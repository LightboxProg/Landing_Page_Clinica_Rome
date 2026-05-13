import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PacientesListadosComponent } from './pacientes-listados.component';

describe('PacientesListadosComponent', () => {
  let component: PacientesListadosComponent;
  let fixture: ComponentFixture<PacientesListadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PacientesListadosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PacientesListadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
