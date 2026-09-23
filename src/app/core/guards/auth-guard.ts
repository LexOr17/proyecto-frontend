import { inject } from '@angular/core';
import { Router, type CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth-service';
import { UserRole } from '../interfaces/auth-response';

/**
 * Guard funcional (`CanMatchFn`) encargado de proteger rutas en la aplicación mediante dos niveles de seguridad:
 * 1. **Autenticación**: Verifica si el usuario cuenta con un token de sesión activo. Si no está autenticado,
 *    lo redirige a la vista de inicio de sesión (`/auth/login`).
 * 2. **Autorización basada en roles (RBAC)**: Si la ruta define roles permitidos en `data: { roles: [...] }`,
 *    comprueba que el rol del usuario autenticado coincida con alguno de los roles requeridos. Si no tiene permisos,
 *    lo redirige al panel principal (`/main/dashboard`).
 *
 * @param route - Información de la ruta candidata a ser emparejada y cargada.
 * @param segments - Segmentos de URL que componen la ruta solicitada.
 * @returns `true` si el acceso es concedido, o un `UrlTree` con la redirección correspondiente si se deniega.
 *
 * @example
 * ```typescript
 * // En la configuración de rutas (app.routes.ts):
 * {
 *   path: 'pacientes',
 *   canMatch: [authGuard],
 *   data: { roles: [UserRole.NUTRIOLOGO, UserRole.ADMINISTRADOR] },
 *   loadChildren: () => import('./features/pacientes/pacientes.routes')
 * }
 * ```
 */
export const authGuard: CanMatchFn = (route, segments) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. Validar si el usuario está autenticado
  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  // 2. Validar autorización según roles configurados en la metadata de la ruta
  const expectedRoles = route.data?.['roles'] as UserRole[] | undefined;

  if (expectedRoles && !authService.hasRole(expectedRoles)) {
    return router.createUrlTree(['/main/dashboard']);
  }

  // 3. Acceso autorizado
  return true;
};
