export type TipoComidaDiario =
  | 'DESAYUNO'
  | 'ALMUERZO'
  | 'COMIDA'
  | 'MERIENDA'
  | 'CENA'
  | 'COLACION_1'
  | 'COLACION_2';

export type EstadoRegistro = 'CUMPLIDO' | 'MODIFICADO' | 'SALTADA' | 'NO_REGISTRADO';

export interface DiarioComidaRequest {
  comidaProgramadaId?: number | null;
  fecha: string; // YYYY-MM-DD
  horario: TipoComidaDiario;
  estado: EstadoRegistro;
  detallesComidaReal?: string | null;
}

export interface DiarioComidaResponse {
  id: number;
  comidaProgramadaId?: number | null;
  nombreComidaSugerida?: string | null;
  fecha: string; // YYYY-MM-DD
  horario: TipoComidaDiario;
  estado: EstadoRegistro;
  detallesComidaReal?: string | null;
  observacionNutriologo?: string | null;
  fechaRegistroSistema: string;
}

export interface ObservacionRequest {
  observacion: string;
}

export const HORARIOS_LABEL: Record<TipoComidaDiario, string> = {
  DESAYUNO: 'Desayuno',
  ALMUERZO: 'Almuerzo',
  COMIDA: 'Comida',
  MERIENDA: 'Merienda',
  CENA: 'Cena',
  COLACION_1: 'Colación 1',
  COLACION_2: 'Colación 2',
};

export const ESTADOS_LABEL: Record<EstadoRegistro, string> = {
  CUMPLIDO: 'Cumplido',
  MODIFICADO: 'Modificado',
  SALTADA: 'Saltada',
  NO_REGISTRADO: 'No Registrado',
};
