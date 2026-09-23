// ============================================================
// Interfaces del Dashboard — Compartidas por los 3 roles
// ============================================================

// --- Admin ---
export interface AdminDashboardStats {
  totalUsuarios: number;
  totalNutriologos: number;
  totalPacientes: number;
  citasHoy: number;
  usuariosActivos: number;
}

// --- Nutriólogo ---
export interface NutriologoDashboardData {
  totalPacientes: number;
  citasPendientes: number;
  citasHoy: number;
  planesActivos: number;
}

// --- Paciente ---
export interface PacienteDashboardData {
  pesoActual: number | null;
  pesoDelta: number | null;   // diferencia con la medida anterior (negativo = bajó)
  proximaCita: ProximaCitaInfo | null;
  resumenMetas: MetaResumen | null;
  diasEnPrograma: number;
  planActivo: PlanResumen | null;
}

export interface ProximaCitaInfo {
  id: number;
  fechaHoraInicio: string;
  estado: string;
  motivoCita: string;
  nombreNutriologo: string;
}

export interface MetaResumen {
  total: number;
  cumplidas: number;
  pendientes: number;
  porValidar: number;
  porcentajeExito: number;
}

export interface PlanResumen {
  id: number;
  nombre: string;
  fechaInicio: string;
  duracionDias: number;
}

export interface UltimaMedida {
  id: number;
  peso: number | null;
  altura: number | null;
  fechaMedicion: string;
}
