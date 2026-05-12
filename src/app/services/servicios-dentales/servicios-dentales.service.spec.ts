import { TestBed } from '@angular/core/testing';

import { ServiciosDentalesService } from './servicios-dentales.service';

describe('ServiciosDentalesService', () => {
  let service: ServiciosDentalesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiciosDentalesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
