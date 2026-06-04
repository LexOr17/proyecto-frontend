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
