import { CanActivateFn } from '@angular/router';

export const paymentExitGuard: CanActivateFn = (route, state) => {
  return true;
};
