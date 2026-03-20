import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../shared/service/notification-service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 ya lo maneja auth-interceptor (mensaje + logout)
      if (error.status === 401) {
        return throwError(() => error);
      }

      const backendMessage = error.error?.mensaje;

      switch (error.status) {
        case 0:
          notificationService.error('No se pudo conectar con el servidor');
          break;
        case 400:
          notificationService.error(backendMessage || 'Solicitud inválida');
          break;
        case 403:
          notificationService.error('No tienes permisos para realizar esta acción');
          break;
        case 404:
          notificationService.error(backendMessage || 'Recurso no encontrado');
          break;
        case 409:
          notificationService.error(backendMessage || 'Conflicto con los datos enviados');
          break;
        default:
          if (error.status >= 500) {
            notificationService.error('Error en el servidor. Intenta más tarde');
          } else {
            notificationService.error(backendMessage || 'Error inesperado. Intenta de nuevo');
          }
      }

      return throwError(() => error);
    })
  );
};
