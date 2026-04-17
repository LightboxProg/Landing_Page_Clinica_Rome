import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasarelaMembresiasComponent } from './pasarela-membresias.component';

describe('PasarelaMembresiasComponent', () => {
  let component: PasarelaMembresiasComponent;
  let fixture: ComponentFixture<PasarelaMembresiasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasarelaMembresiasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PasarelaMembresiasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
