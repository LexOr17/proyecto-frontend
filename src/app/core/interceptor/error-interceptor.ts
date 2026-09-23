import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../shared/service/notification-service';

/**
 * Interceptor HTTP funcional (`HttpInterceptorFn`) encargado del manejo global y centralizado de errores en la aplicación:
 *
 * - **Separación de responsabilidades**: Omite el error `401 Unauthorized`, ya que es administrado de forma dedicada
 *   por el `authInterceptor` (para gestionar la caducidad del token y redirección a login).
 * - **Interpretación de códigos de estado**:
 *   - `0`: Fallos de conectividad de red o indisponibilidad del servidor backend (CORS / conexión rechazada).
 *   - `400 Bad Request`: Formatea errores de validación de campos recibidos en el payload `datos` o muestra el mensaje del backend.
 *   - `403 Forbidden`: Muestra aviso de permisos insuficientes para la acción solicitada.
 *   - `409 Conflict`: Avisa sobre inconsistencias o duplicidad en los datos enviados.
 *   - `500+ Internal Server Error`: Notifica caídas o fallos no controlados en el servidor backend.
 *   - Otros códigos: Muestra el mensaje devuelto por el backend o un mensaje genérico de error.
 * - **Notificación Visual**: Emite mensajes toast claros y contextuales al usuario mediante `NotificationService`.
 * - **Propagación**: Re-lanza el error mediante `throwError` para permitir manejo local adicional en componentes/servicios.
 *
 * @param req - Solicitud HTTP entrante en la cadena.
 * @param next - Siguiente manejador o middleware HTTP.
 * @returns Flujo observable procesado con captura y notificación de errores.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 ya es gestionado específicamente por authInterceptor (mensaje + logout + redirección)
      if (error.status === 401) {
        return throwError(() => error);
      }

      const backendMessage = error.error?.mensaje;

      switch (error.status) {
        // Fallo de conexión de red o servidor caído
        case 0:
          notificationService.error('No se pudo conectar con el servidor');
          break;

        // Petición incorrecta o validación de campos fallida
        case 400:
          if (error.error?.datos && typeof error.error.datos === 'object') {
            const validationErrors = error.error.datos;
            const messages = Object.values(validationErrors).join(', ');
            notificationService.error(messages || 'Error de validación');
          } else {
            notificationService.error(backendMessage || 'Solicitud inválida');
          }
          break;

        // Acceso prohibido por falta de privilegios
        case 403:
          notificationService.error(backendMessage || 'No tienes permisos para realizar esta acción');
          break;

        // Conflicto de recursos (ej. registro duplicado)
        case 409:
          notificationService.error(backendMessage || 'Conflicto con los datos enviados');
          break;

        // Errores internos de servidor o códigos no contemplados
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
