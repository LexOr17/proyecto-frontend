export type EstadoMeta = 'PENDIENTE' | 'POR_VALIDAR' | 'CUMPLIDA' | 'RECHAZADA' | 'NO_CUMPLIDA';

export interface MetaResponse {
  id: number;
  descripcion: string;
  fechaObjetivo: string;
  estado: EstadoMeta;
  observaciones?: string | null;
  pacienteId: number;
  nutriologoId: number;
}

export interface MetaRequest {
  descripcion: string;
  fechaObjetivo: string;
  pacienteId: number;
}

export interface MetaEstadoRequest {
  nuevoEstado: EstadoMeta;
  observaciones?: string;
}

export interface MetaStatusCount {
  pendientes: number;
  porValidar: number;
  cumplidas: number;
  rechazadas: number;
  noCumplidas: number;
  total: number;
  porcentaje?: number;
  porcentajeExito?: number;
}
