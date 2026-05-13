import { TestBed } from '@angular/core/testing';

import { ListaNegraService } from './lista-negra.service';

describe('ListaNegraService', () => {
  let service: ListaNegraService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ListaNegraService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
