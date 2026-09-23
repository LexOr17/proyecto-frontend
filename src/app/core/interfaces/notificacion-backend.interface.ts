/**
 * Tipos de notificación disponibles en el sistema.
 * Debe coincidir de forma estricta con el enum `TipoNotificacion` definido en el backend.
 */
export type TipoNotificacion =
  | 'NUEVA_PLANTILLA'
  | 'PACIENTE_ASIGNADO'
  | 'PLAN_ASIGNADO'
  | 'NUEVO_ALIMENTO'
  | 'CITA_SOLICITADA'
  | 'CITA_ACTUALIZADA'
  | 'NUEVO_MENSAJE_CHAT'
  | 'NUEVA_SUGERENCIA'
  | 'SUGERENCIA_REVISADA';

/**
 * Modelo de datos para las notificaciones del backend (`NotificacionDTO`).
 * Se utiliza de forma uniforme tanto para los mensajes recibidos en tiempo real por WebSocket (STOMP)
 * como para las consultas históricas paginadas a través del API REST.
 */
export interface NotificacionBackend {
  /**
   * Identificador único del registro intermedio `NotificacionUsuario`.
   * Es la clave primaria utilizada para marcar la notificación como leída en el servidor.
   */
  notificacionUsuarioId: number;

  /**
   * Identificador de la notificación base o entidad principal generada por el sistema.
   */
  notificacionId: number;

  /**
   * Categoría o tipo de la notificación para segmentar o mostrar iconos correspondientes.
   */
  tipo: TipoNotificacion;

  /**
   * Título corto o asunto de la notificación.
   */
  titulo: string;

  /**
   * Contenido detallado o cuerpo del mensaje informativo.
   */
  mensaje: string;

  /**
   * Ruta relativa interna para redirigir al usuario al recurso correspondiente al hacer clic.
   * Puede ser `null` si la notificación es puramente informativa y no requiere navegación.
   */
  actionUrl: string | null;

  /**
   * Indica si la notificación ya ha sido leída o atendida por el usuario destinatario.
   */
  leida: boolean;

  /**
   * Fecha y hora de creación de la notificación en formato ISO 8601 string (ej. "2026-08-13T10:30:00Z").
   */
  creadoEn: string;
}
