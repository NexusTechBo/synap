import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Role } from '../models/api.models';
import { HOME_URL } from '../navigation/navigation';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return auth
    .ensureSession()
    .pipe(map((restored) => (restored ? true : router.createUrlTree(['/login']))));
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return router.createUrlTree([HOME_URL]);
  return auth
    .ensureSession()
    .pipe(map((restored) => (restored ? router.createUrlTree([HOME_URL]) : true)));
};

export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const evaluate = () => (auth.hasRole(...roles) ? true : router.createUrlTree([HOME_URL]));
    return auth.isAuthenticated() ? evaluate() : auth.ensureSession().pipe(map(evaluate));
  };
}
