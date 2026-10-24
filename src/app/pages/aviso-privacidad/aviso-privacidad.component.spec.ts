import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvisoPrivacidadComponent } from './aviso-privacidad.component';

describe('AvisoPrivacidadComponent', () => {
  let component: AvisoPrivacidadComponent;
  let fixture: ComponentFixture<AvisoPrivacidadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvisoPrivacidadComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AvisoPrivacidadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe inicializarse con el aviso integral por defecto', () => {
    expect(component.tipoAviso).toBe('integral');
  });

  it('debe cambiar al aviso de recepcion al invocar setTipoAviso', () => {
    component.setTipoAviso('recepcion');
    expect(component.tipoAviso).toBe('recepcion');

    component.setTipoAviso('integral');
    expect(component.tipoAviso).toBe('integral');
  });
});
