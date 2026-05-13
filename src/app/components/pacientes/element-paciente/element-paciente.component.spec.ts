import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementPacienteComponent } from './element-paciente.component';

describe('ElementPacienteComponent', () => {
  let component: ElementPacienteComponent;
  let fixture: ComponentFixture<ElementPacienteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElementPacienteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ElementPacienteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
