import { Router, type CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { inject } from '@angular/core';
import { UserRole } from '../interfaces/auth-response';

export const authGuard: CanMatchFn = (route, segments) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const expectedRoles = route.data?.['roles'] as UserRole[] | undefined;

  if (expectedRoles && !authService.hasRole(expectedRoles)) {
    return router.createUrlTree(['/main/dashboard']);
  }

  return true;
};
