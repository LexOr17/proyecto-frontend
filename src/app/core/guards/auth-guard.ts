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
    return router.createUrlTree(['/unauthorized']); 
    // Opcional: Podrías retornar `false` si quieres que el router 
    // siga buscando otra ruta que coincida (ej: mostrar un 404 en vez de 403).
  }

  return true;
};
