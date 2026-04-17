import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogoMembresiasComponent } from './catalogo-membresias.component';

describe('CatalogoMembresiasComponent', () => {
  let component: CatalogoMembresiasComponent;
  let fixture: ComponentFixture<CatalogoMembresiasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogoMembresiasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CatalogoMembresiasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
