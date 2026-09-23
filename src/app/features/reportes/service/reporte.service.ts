import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ReporteAsistencia,
  ReporteDemografico,
  ReporteDesempenoNutriologo,
  ReporteProgreso,
  ReportePropuestaPlan,
  ReporteSeguimientoPlan,
} from '../interfaces/reporte.interface';

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/reportes`;

  obtenerReporteDemografico(): Observable<ReporteDemografico> {
    return this.http.get<ReporteDemografico>(`${this.baseUrl}/demografico`);
  }

  obtenerReporteProgreso(pacienteId: number): Observable<ReporteProgreso> {
    return this.http.get<ReporteProgreso>(`${this.baseUrl}/progreso/${pacienteId}`);
  }

  obtenerReporteSeguimientoPlan(
    pacienteId: number,
    inicio?: string,
    fin?: string
  ): Observable<ReporteSeguimientoPlan> {
    let params = new HttpParams();
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<ReporteSeguimientoPlan>(
      `${this.baseUrl}/seguimiento-plan/${pacienteId}`,
      { params }
    );
  }

  /**
   * Obtiene el reporte de asistencia y demanda de servicios.
   * @param nutriologoId ID del nutriólogo a filtrar (solo para ADMINISTRADOR; null = todos)
   * @param inicio       Fecha de inicio ISO (YYYY-MM-DD)
   * @param fin          Fecha de fin ISO (YYYY-MM-DD)
   */
  obtenerReporteAsistencia(
    nutriologoId?: number | null,
    inicio?: string,
    fin?: string
  ): Observable<ReporteAsistencia> {
    let params = new HttpParams();
    if (nutriologoId != null) params = params.set('nutriologoId', String(nutriologoId));
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<ReporteAsistencia>(`${this.baseUrl}/asistencia`, { params });
  }

  /**
   * Obtiene el reporte de desempeño y atención del nutriólogo.
   * @param nutriologoId ID del nutriólogo a filtrar (solo para ADMINISTRADOR; null = todos/global)
   * @param inicio       Fecha de inicio ISO (YYYY-MM-DD)
   * @param fin          Fecha de fin ISO (YYYY-MM-DD)
   */
  obtenerReporteDesempenoNutriologo(
    nutriologoId?: number | null,
    inicio?: string,
    fin?: string
  ): Observable<ReporteDesempenoNutriologo> {
    let params = new HttpParams();
    if (nutriologoId != null) params = params.set('nutriologoId', String(nutriologoId));
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<ReporteDesempenoNutriologo>(`${this.baseUrl}/desempeno-nutriologo`, { params });
  }

  /**
   * Obtiene el reporte de propuestas de plan alimenticio y comunicación proactiva de pacientes.
   * @param nutriologoId ID del nutriólogo a filtrar (solo para ADMINISTRADOR; null = todos/global)
   * @param inicio       Fecha de inicio ISO (YYYY-MM-DD)
   * @param fin          Fecha de fin ISO (YYYY-MM-DD)
   */
  obtenerReportePropuestaPlan(
    nutriologoId?: number | null,
    inicio?: string,
    fin?: string
  ): Observable<ReportePropuestaPlan> {
    let params = new HttpParams();
    if (nutriologoId != null) params = params.set('nutriologoId', String(nutriologoId));
    if (inicio) params = params.set('inicio', inicio);
    if (fin) params = params.set('fin', fin);
    return this.http.get<ReportePropuestaPlan>(`${this.baseUrl}/propuesta-plan`, { params });
  }
}
