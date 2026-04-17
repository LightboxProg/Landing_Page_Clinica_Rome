import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { paymentExitGuard } from './payment-exit.guard';

describe('paymentExitGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => paymentExitGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
