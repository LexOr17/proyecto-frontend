export interface ReporteDemografico {
  totalPacientes: number;
  distribucionPorNutriologo: Record<string, number>;
  distribucionPorGenero: Record<string, number>;
  distribucionPorRangoEdad: Record<string, number>;
}

export interface ReporteProgreso {
  fechas: string[];
  pesos: number[];
  porcentajesGrasa: number[];
  indicesCinturaTalla: number[];
  indicesCinturaCadera: number[];
}

export interface ReporteSeguimientoPlan {
  totalMetas: number;
  metasCumplidas: number;
  metasEnProgreso: number;
  metasNoCumplidas: number;
  porcentajeCumplimientoMetas: number;

  totalRegistros: number;
  registrosCumplidos: number;
  registrosModificados: number;
  registrosSaltados: number;
  registrosNoRegistrados: number;
  porcentajeApego: number;

  desviacionPorDia: Record<string, number>;

  periodoInicio: string;
  periodoFin: string;
  nombrePaciente?: string;
}

export interface ReporteAsistencia {
  // Totales por estado
  totalCitas: number;
  citasAsistidas: number;
  citasNoAsistidas: number;
  citasCanceladas: number;
  citasProgramadas: number;
  citasReprogramadas: number;

  // Indicadores de eficiencia
  porcentajeAsistencia: number;
  porcentajeInasistencia: number;
  porcentajeCancelacion: number;

  // Demanda de servicios
  demandaPorMotivo: Record<string, number>;
  motivoMasFrecuente: string;

  // Metadatos
  periodoInicio: string;
  periodoFin: string;
  nombreNutriologo?: string;
}

export interface AlimentoFrecuente {
  alimentoId: number;
  nombre: string;
  categoria: string;
  vecesUtilizado: number;
  porcentajeUso: number;
}

export interface ReporteDesempenoNutriologo {
  // Metadatos
  nutriologoId?: number;
  nombreNutriologo?: string;
  correoNutriologo?: string;
  periodoInicio: string;
  periodoFin: string;

  // Gestión de Pacientes y Carga de Trabajo
  totalPacientesActivos: number;
  totalCitasPeriodo: number;
  citasConcretadas: number;
  citasCanceladas: number;
  citasPendientes: number;
  citasNoAsistidas: number;
  porcentajeAtencion: number;
  porcentajeCancelacion: number;
  promedioCitasPorPaciente: number;
  nivelCargaTrabajo: 'BAJA' | 'MODERADA' | 'OPTIMA' | 'ALTA' | 'SOBRECARGA' | string;
  diagnosticoCarga: string;

  // Contenido y Planeación (Prescripción en Plantillas)
  topAlimentosAsignados: AlimentoFrecuente[];
  distribucionAlimentosPorCategoria: Record<string, number>;

  // Aportación a la Base de Datos
  totalAlimentosRegistrados: number;
  totalPlantillasRegistradas: number;
  plantillasPorTipoComida: Record<string, number>;
  alimentosRegistradosPorCategoria: Record<string, number>;
}

export interface AlimentoSustituido {
  alimentoId: number;
  nombre: string;
  categoria: string;
  vecesSolicitado: number;
  porcentajeTotal: number;
}

export interface ReportePropuestaPlan {
  // Metadatos
  nutriologoId?: number;
  nombreNutriologo?: string;
  correoNutriologo?: string;
  periodoInicio: string;
  periodoFin: string;

  // 1. Tasa de Solicitud de Cambio y Métricas Generales
  totalPacientes: number;
  pacientesConSolicitud: number;
  tasaSolicitudCambio: number;
  totalSolicitudes: number;
  promedioSolicitudesPorPaciente: number;
  solicitudesAprobadas: number;
  solicitudesRechazadas: number;
  solicitudesPendientes: number;
  tasaAprobacion: number;

  // 2. Gráfica y Desglose de Razones Principales ("Por Qué")
  razonesPrincipales: Record<string, number>;
  razonMasFrecuente: string;

  // 3. Alimentos Problemáticos y Plantillas Sustituidas
  alimentosProblematicos: AlimentoSustituido[];
  plantillasMasModificadas: Record<string, number>;

  // 4. Perfil de Pacientes (Inducción vs Seguimiento)
  solicitudesPacientesNuevos: number;
  solicitudesPacientesSeguimiento: number;
  porcentajePacientesNuevos: number;
  porcentajePacientesSeguimiento: number;
  totalPacientesNuevos: number;
  totalPacientesSeguimiento: number;
  diagnosticoPerfil: string;
  diagnosticoReceptividad: string;
}
