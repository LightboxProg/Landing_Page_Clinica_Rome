import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvisoTerminosComponent } from './aviso-terminos.component';

describe('AvisoTerminosComponent', () => {
  let component: AvisoTerminosComponent;
  let fixture: ComponentFixture<AvisoTerminosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvisoTerminosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AvisoTerminosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
