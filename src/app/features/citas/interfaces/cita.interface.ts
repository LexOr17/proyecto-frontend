export type EstadoCita =
  | 'PROGRAMADA'
  | 'SOLICITADA'
  | 'CANCELADA'
  | 'REPROGRAMACION_SOLICITADA'
  | 'ASISTIO'
  | 'NO_ASISTIO';

export type MotivoCita =
  | 'PRIMERA_VEZ'
  | 'SEGUIMIENTO'
  | 'REVISION_DE_PLAN'
  | 'NUEVO_SINTOMA'
  | 'CONTROL_MENSUAL'
  | 'OTRO';

// ─── Response DTOs ────────────────────────────────────────────────────────────

export interface CitaResponse {
  id: number;
  pacienteId: number;
  nombrePaciente: string;
  nutriologoId: number;
  nombreNutriologo: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  motivoCita: MotivoCita;
  estado: EstadoCita;
  observaciones?: string;
  fechaHoraReprogramacionSolicitada?: string;
}

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export interface CitaRequest {
  pacienteId: number;
  nutriologoId: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  motivoCita: MotivoCita;
}

export interface CitaSolicitudRequest {
  fechaHoraInicio: string;
  motivoCita: MotivoCita;
}

export interface CitaReprogramarRequest {
  nuevaFechaHoraInicio: string;
}

export interface FinalizarCitaRequest {
  asistio: boolean;
  observaciones?: string;
}
