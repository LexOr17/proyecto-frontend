import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { NotificationService } from '../../shared/service/notification-service';

/**
 * Interceptor HTTP funcional (`HttpInterceptorFn`) responsable de la autenticación en las peticiones salientes:
 *
 * 1. **Inyección de Token JWT**: Inspecciona si existe un token en la sesión actual (`AuthService.token()`)
 *    y, de ser así, clona la solicitud HTTP agregando el encabezado `Authorization: Bearer <token>`.
 * 2. **Gestión de Errores de Autenticación (HTTP 401)**: Captura respuestas `401 Unauthorized` (sesión vencida
 *    o credenciales inválidas), notificando al usuario visualmente y ejecutando el cierre de sesión (`AuthService.logout()`).
 * 3. **Propagación del Error**: Re-emite el error hacia los flujos de llamada para permitir que componentes
 *    o servicios cancelen estados de carga o ejecuten lógica complementaria.
 *
 * @param req - Solicitud HTTP saliente interceptada.
 * @param next - Siguiente manejador o middleware en la cadena de interceptores HTTP.
 * @returns Flujo observable del evento HTTP procesado.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const token = authService.token();

  // 1. Clonar la petición si existe un token de sesión disponible
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // 2. Ejecutar la petición y gestionar excepciones de autenticación
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejar token expirado, inválido o no autorizado por el backend
      if (error.status === 401) {
        const message = error.error?.mensaje || 'Sesión expirada. Por favor, inicia sesión de nuevo';
        notificationService.error(message);
        authService.logout();
      }

      // Propagar el error para que los servicios/componentes consumidores puedan reaccionar
      return throwError(() => error);
    })
  );
};