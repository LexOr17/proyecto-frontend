export type CalidadSueno = 'BUENA' | 'REGULAR' | 'MALA' | 'EXCELENTE';

export type EstadoAnimo = 'FELIZ' | 'TRISTE' | 'ANSIOSO' | 'CANSADO' | 'NORMAL';

export type Sintoma =
  | 'NINGUNO'
  | 'INFLAMACION_ABDOMINAL'
  | 'GASES'
  | 'ACIDEZ_REFLUJO'
  | 'ESTRENIMIENTO'
  | 'DIARREA'
  | 'NAUSEAS'
  | 'FATIGA_CRONICA'
  | 'INSOMNIO'
  | 'NIEBLA_MENTAL'
  | 'DOLOR_CABEZA'
  | 'MAREO'
  | 'IRRITABILIDAD'
  | 'ANSIEDAD_POR_DULCE'
  | 'SED_EXCESIVA'
  | 'DOLOR_MUSCULAR'
  | 'RETENCION_LIQUIDOS'
  | 'OTRO';

export type TipoActividad =
  | 'NINGUNA'
  | 'CAMINATA_LIGERA'
  | 'CAMINATA_VELOZ'
  | 'TROTAR_CORRER'
  | 'CICLISMO'
  | 'NATACION'
  | 'BAILE'
  | 'HIIT'
  | 'PESAS_GIMNASIO'
  | 'CALISTENIA'
  | 'PILATES'
  | 'YOGA'
  | 'ESTIRAMIENTOS_MOVILIDAD'
  | 'MEDITACION'
  | 'DESCANSO_ACTIVO'
  | 'TAREAS_HOGAR'
  | 'OTRO';

export interface BebidaConsumida {
  id?: number;
  nombre: string;
  cantidad: number;
}

export interface DiarioExtendidoPacienteRequest {
  fecha: string;
  estadoAnimo: EstadoAnimo;
  calidadSueno: CalidadSueno;
  sintomaPrincipal: Sintoma;
  sintomaDetalle?: string;
  actividadRealizada?: boolean;
  bebidas?: BebidaConsumida[];
}

export interface DiarioExtendidoNutriologoRequest {
  tipoActividadSugerida?: TipoActividad;
  actividadDetalle?: string;
  observacionesNutriologo?: string;
}

export interface DiarioExtendidoResponse {
  id: number;
  pacienteId: number;
  fecha: string;
  estadoAnimo: EstadoAnimo;
  calidadSueno: CalidadSueno;
  sintomaPrincipal: Sintoma;
  sintomaDetalle?: string;
  actividadRealizada?: boolean;
  bebidas?: BebidaConsumida[];
  tipoActividadSugerida?: TipoActividad;
  actividadDetalle?: string;
  observacionesNutriologo?: string;
}

export const ESTADO_ANIMO_MAP: Record<EstadoAnimo, { emoji: string; label: string; score: number }> = {
  FELIZ:   { emoji: '😊', label: 'Motivado',  score: 5 },
  NORMAL:  { emoji: '😐', label: 'Bien',       score: 4 },
  CANSADO: { emoji: '🥱', label: 'Agotado',   score: 3 },
  ANSIOSO: { emoji: '😰', label: 'Ansioso',   score: 2 },
  TRISTE:  { emoji: '☹️', label: 'Bajo',      score: 1 },
};

export const CALIDAD_SUENO_MAP: Record<CalidadSueno, { label: string; horas: number }> = {
  EXCELENTE: { label: 'Excelente', horas: 9.0 },
  BUENA:     { label: 'Buena',     horas: 7.5 },
  REGULAR:   { label: 'Regular',   horas: 6.0 },
  MALA:      { label: 'Mala',      horas: 4.5 },
};

export const SINTOMA_LABEL: Record<Sintoma, string> = {
  NINGUNO:               'Ninguno (Me siento bien)',
  INFLAMACION_ABDOMINAL: 'Inflamación Abdominal',
  GASES:                 'Gases',
  ACIDEZ_REFLUJO:        'Acidez / Reflujo',
  ESTRENIMIENTO:         'Estreñimiento',
  DIARREA:               'Diarrea',
  NAUSEAS:               'Náuseas',
  FATIGA_CRONICA:        'Fatiga / Cansancio',
  INSOMNIO:              'Insomnio',
  NIEBLA_MENTAL:         'Niebla Mental',
  DOLOR_CABEZA:          'Dolor de Cabeza',
  MAREO:                 'Mareo',
  IRRITABILIDAD:         'Irritabilidad',
  ANSIEDAD_POR_DULCE:    'Ansiedad por Dulce',
  SED_EXCESIVA:          'Sed Excesiva',
  DOLOR_MUSCULAR:        'Dolor Muscular',
  RETENCION_LIQUIDOS:    'Retención de Líquidos',
  OTRO:                  'Otro síntoma...',
};

export const TIPO_ACTIVIDAD_LABEL: Record<TipoActividad, string> = {
  NINGUNA:                 'Sin actividad (Descanso)',
  CAMINATA_LIGERA:         'Caminata Ligera',
  CAMINATA_VELOZ:          'Caminata Veloz',
  TROTAR_CORRER:           'Trotar / Correr',
  CICLISMO:                'Ciclismo',
  NATACION:                'Natación',
  BAILE:                   'Baile',
  HIIT:                    'HIIT',
  PESAS_GIMNASIO:          'Entrenamiento de Fuerza',
  CALISTENIA:              'Calistenia',
  PILATES:                 'Pilates',
  YOGA:                    'Yoga',
  ESTIRAMIENTOS_MOVILIDAD: 'Estiramientos / Movilidad',
  MEDITACION:              'Meditación',
  DESCANSO_ACTIVO:         'Descanso Activo',
  TAREAS_HOGAR:            'Tareas del Hogar',
  OTRO:                    'Otra actividad...',
};
