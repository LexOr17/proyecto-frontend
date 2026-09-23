export interface SeguimientoConsulta {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  nutriologoId: number;
  nutriologoNombre: string;

  fechaInicio: string;
  fechaFin: string;
  fechaConsulta: string;
  actualizadoEn: string | null;

  // Snapshot KPIs
  pesoInicio: number | null;
  pesoFin: number | null;
  diferenciaPeso: number | null;

  totalComidasRegistradas: number;
  comidasCumplidas: number;
  comidasModificadas: number;
  comidasSaltadas: number;
  pctCumplimientoAlimentos: number;

  diasActividadRealizada: number;
  totalDiasExtendidos: number;
  pctActividad: number;

  totalMetas: number;
  metasCumplidas: number;

  totalCitas: number;
  citasCompletadas: number;

  // Texto del nutriólogo
  observaciones: string | null;
  conclusiones: string | null;
  recomendaciones: string | null;
}

export interface SeguimientoPreview {
  pacienteId: number;
  pacienteNombre: string;
  fechaInicio: string;
  fechaFin: string;

  pesoInicio: number | null;
  pesoFin: number | null;
  diferenciaPeso: number | null;

  totalComidasRegistradas: number;
  comidasCumplidas: number;
  comidasModificadas: number;
  comidasSaltadas: number;
  pctCumplimientoAlimentos: number;

  diasActividadRealizada: number;
  totalDiasExtendidos: number;
  pctActividad: number;

  totalMetas: number;
  metasCumplidas: number;

  totalCitas: number;
  citasCompletadas: number;
}

export interface CrearSeguimientoRequest {
  pacienteId: number;
  fechaInicio: string;
  fechaFin: string;
  observaciones: string | null;
  conclusiones: string | null;
  recomendaciones: string | null;
}

export interface ActualizarObservacionesRequest {
  observaciones: string | null;
  conclusiones: string | null;
  recomendaciones: string | null;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
