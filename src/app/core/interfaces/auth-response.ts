/**
 * Representa la estructura genérica estándar de respuesta emitida por el backend.
 *
 * @template T - Tipo de dato contenido en el payload de respuesta `datos`.
 */
export interface ApiResponse<T> {
  /** Mensaje descriptivo o informativo del resultado de la operación. */
  mensaje: string;
  /** Código de estado HTTP retornado en la respuesta (ej. 200, 400, 404, 500). */
  estatus: number;
  /** Datos devueltos por el servidor o `null` si no hay carga útil. */
  datos: T | null;
  /** Marca de tiempo ISO que indica cuándo se generó la respuesta. */
  timestamp: string;
}

/**
 * Respuesta específica entregada por el backend en los flujos de autenticación e inicio de sesión.
 */
export interface AuthResponse {
  /** Mensaje descriptivo sobre el resultado de la autenticación. */
  mensaje: string;
  /** Código de estado HTTP devuelto por el servidor. */
  estatus: number;
  /** Objeto que contiene los datos del usuario autenticado y el token JWT, o `null` en caso de error. */
  datos: Datos | null;
  /** Marca de tiempo ISO que indica cuándo se procesó la autenticación. */
  timestamp: string;
}

/**
 * Estructura del payload con la información de sesión y credenciales del usuario autenticado.
 */
export interface Datos {
  /** Token de acceso JWT emitido para autorizar las peticiones HTTP posteriores. */
  token: string;
  /** Rol o perfil asignado al usuario en el sistema (ej. ADMINISTRADOR, NUTRIOLOGO, PACIENTE). */
  rol: string;
  /** Fecha u hora límite de expiración del token JWT. */
  expirationTime: string;
  /** Nombre de pila del usuario autenticado. */
  nombre: string;
  /** Apellidos del usuario autenticado. */
  apellidos: string;
  /** Identificador único del usuario en la base de datos (representado como cadena). */
  id: string;
}

/**
 * Enumeración con los roles de usuario permitidos y reconocidos en el sistema.
 * Coincide con las definiciones de roles del backend para el control de acceso (RBAC).
 */
export enum UserRole {
  /** Rol con privilegios totales de administración en la plataforma. */
  ADMINISTRADOR = 'ADMINISTRADOR',
  /** Rol asignado a especialistas en nutrición que gestionan pacientes y planes. */
  NUTRIOLOGO = 'NUTRIOLOGO',
  /** Rol asignado a los pacientes que consultan sus dietas y progresos. */
  PACIENTE = 'PACIENTE'
}
