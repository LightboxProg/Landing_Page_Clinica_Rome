import { TestBed } from '@angular/core/testing';

import { MembresiasService } from './membresias.service';

describe('MembresiasService', () => {
  let service: MembresiasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MembresiasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
