// ─── Resumen del Mes ────────────────────────────────────────────────────────

export interface DiaResumenNutriologo {
  fecha: string; // YYYY-MM-DD
  tieneCitas: boolean;
  cantidadCitas: number;
  tieneHorasLibres: boolean;
  pacientesSinDiario: number;
}

export interface CalendarioMesNutriologoResponse {
  year: number;
  month: number;
  dias: DiaResumenNutriologo[];
}

export interface DiaResumenPaciente {
  fecha: string; // YYYY-MM-DD
  tieneCita: boolean;
  tienePlan: boolean;
  diarioCompleto: boolean;
  bienestarRegistrado: boolean;
}

export interface CalendarioMesPacienteResponse {
  year: number;
  month: number;
  dias: DiaResumenPaciente[];
}

// ─── Resumen del Día ────────────────────────────────────────────────────────

export interface HoraLibre {
  hora: string;
  fechaHoraCompleta: string;
}

export interface PacienteSinDiario {
  pacienteId: number;
  nombreCompleto: string;
}

export interface CitaCalendario {
  id: number;
  pacienteNombre?: string;
  pacienteId?: number;
  nutriologoNombre?: string;
  fechaHoraInicio: string;
  fechaHoraFin?: string;
  estado: string;
  motivoCita: string;
}

export interface ComidaProgramadaCalendario {
  id: number;
  horario: string;
  plantillaNombre: string;
  observaciones?: string;
}

export interface RegistroDiarioCalendario {
  id: number;
  horario: string;
  estado: string;
  comidaProgramadaId?: number;
}

export interface BienestarCalendario {
  id?: number;
  registrado: boolean;
}

export interface CalendarioDiaNutriologoResponse {
  fecha: string;
  citas: CitaCalendario[];
  horasLibres: HoraLibre[];
  pacientesSinDiario: PacienteSinDiario[];
}

export interface CalendarioDiaPacienteResponse {
  fecha: string;
  citas: CitaCalendario[];
  comidasProgramadas: ComidaProgramadaCalendario[];
  registrosDiario: RegistroDiarioCalendario[];
  bienestar: BienestarCalendario | null;
}

export interface PlanPorFinalizar {
  planId: number;
  planNombre: string;
  pacienteId: number;
  pacienteNombre: string;
  fechaInicio: string;
  duracionDias: number;
  fechaFin: string;
}

export interface CalendarDay {
  date: Date;
  dateStr: string;           // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  resumenNutriologo?: DiaResumenNutriologo;
  resumenPaciente?: DiaResumenPaciente;
  planesFinalizan?: PlanPorFinalizar[];
}

export type EstadoCitaCalendario =
  | 'PROGRAMADA'
  | 'SOLICITADA'
  | 'CANCELADA'
  | 'CANCELACION_SOLICITADA'
  | 'REPROGRAMACION_SOLICITADA'
  | 'ASISTIO'
  | 'NO_ASISTIO';

export const ESTADO_CITA_LABEL: Record<string, string> = {
  PROGRAMADA: 'Programada',
  SOLICITADA: 'Solicitada',
  CANCELADA: 'Cancelada',
  CANCELACION_SOLICITADA: 'Cancel. Solicitada',
  REPROGRAMACION_SOLICITADA: 'Reprog. Solicitada',
  ASISTIO: 'Asistió',
  NO_ASISTIO: 'No Asistió',
};

export const ESTADO_CITA_COLOR: Record<string, string> = {
  PROGRAMADA: 'estado-programada',
  SOLICITADA: 'estado-solicitada',
  CANCELADA: 'estado-cancelada',
  CANCELACION_SOLICITADA: 'estado-cancelacion',
  REPROGRAMACION_SOLICITADA: 'estado-reprogramacion',
  ASISTIO: 'estado-asistio',
  NO_ASISTIO: 'estado-no-asistio',
};

export const HORARIO_LABEL: Record<string, string> = {
  DESAYUNO: 'Desayuno',
  ALMUERZO: 'Almuerzo',
  COMIDA: 'Comida',
  MERIENDA: 'Merienda',
  CENA: 'Cena',
  COLACION_1: 'Colación 1',
  COLACION_2: 'Colación 2',
};

export const ESTADO_DIARIO_LABEL: Record<string, string> = {
  CUMPLIDO: 'Cumplido',
  MODIFICADO: 'Modificado',
  SALTADA: 'Saltada',
  NO_REGISTRADO: 'No Registrado',
};

export const MOTIVO_CITA_LABEL: Record<string, string> = {
  PRIMERA_VEZ: 'Primera Vez',
  SEGUIMIENTO: 'Seguimiento',
  REVISION_DE_PLAN: 'Revisión de Plan',
  NUEVO_SINTOMA: 'Nuevo Síntoma',
  CONTROL_MENSUAL: 'Control Mensual',
  OTRO: 'Otro',
};
