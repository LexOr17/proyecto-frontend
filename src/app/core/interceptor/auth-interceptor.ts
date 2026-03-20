import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { NotificationService } from '../../shared/service/notification-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const token = authService.token();

  // 1. Clonar la petición si existe el token
  // Es buena práctica clonarla en una variable nueva para mantener el flujo limpio
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // 2. Manejar la respuesta y los errores
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el backend nos dice "No autorizado" (Token vencido o inválido)
      if (error.status === 401) {
        const message = error.error?.mensaje || 'Sesión expirada. Por favor, inicia sesión de nuevo';
        notificationService.error(message);
        authService.logout();
      }

      // Propagamos el error para que el componente también se entere si es necesario
      // (ej: para ocultar un spinner de carga)
      return throwError(() => error);
    })
  );
};