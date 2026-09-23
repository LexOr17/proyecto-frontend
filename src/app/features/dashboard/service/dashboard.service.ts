import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import {
  AdminDashboardStats,
  UltimaMedida,
  MetaResumen,
  PlanResumen,
} from '../interfaces/dashboard.interfaces';
import { CitaResponse } from '../../citas/interfaces/cita.interface';
import { MetaResponse, MetaStatusCount } from '../../metas/interfaces/meta.interface';
import { PlanAlimenticioResponse } from '../../planes/interfaces/plan.interface';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.baseUrl;

  // ── ADMIN ─────────────────────────────────────────────────
  getAdminStats(): Observable<ApiResponse<AdminDashboardStats>> {
    return this.http.get<ApiResponse<AdminDashboardStats>>(
      `${this.base}/api/dashboard/admin/stats`
    );
  }

  getReporteDemografico(): Observable<any> {
    return this.http.get<any>(`${this.base}/api/reportes/demografico`);
  }

  getUsuariosRecientes(): Observable<any> {
    return this.http.get<any>(`${this.base}/usuarios?size=5&sort=id,desc`);
  }

  // ── NUTRIÓLOGO ────────────────────────────────────────────
  getCitasNutriologo(nutriologoId: number): Observable<ApiResponse<CitaResponse[]>> {
    return this.http.get<ApiResponse<CitaResponse[]>>(
      `${this.base}/citas/nutriologo/${nutriologoId}`
    );
  }

  getPacientesNutriologo(page = 0, size = 5): Observable<any> {
    return this.http.get<any>(
      `${this.base}/nutriologos/pacientes?page=${page}&size=${size}`
    );
  }

  getResumenMetasPaciente(pacienteId: number): Observable<ApiResponse<MetaStatusCount>> {
    return this.http.get<ApiResponse<MetaStatusCount>>(
      `${this.base}/metas/paciente/${pacienteId}/resumen`
    );
  }

  getPlanesPaciente(pacienteId: number): Observable<ApiResponse<PlanAlimenticioResponse[]>> {
    return this.http.get<ApiResponse<PlanAlimenticioResponse[]>>(
      `${this.base}/planes-alimenticios/paciente/${pacienteId}`
    );
  }

  // ── PACIENTE ──────────────────────────────────────────────
  getUltimaMedida(pacienteId: number): Observable<ApiResponse<UltimaMedida>> {
    return this.http.get<ApiResponse<UltimaMedida>>(
      `${this.base}/medidas/ultima/${pacienteId}`
    );
  }

  getHistorialMedidas(pacienteId: number): Observable<ApiResponse<UltimaMedida[]>> {
    return this.http.get<ApiResponse<UltimaMedida[]>>(
      `${this.base}/medidas/historial/${pacienteId}`
    );
  }

  getCitasPaciente(pacienteId: number): Observable<ApiResponse<CitaResponse[]>> {
    return this.http.get<ApiResponse<CitaResponse[]>>(
      `${this.base}/citas/paciente/${pacienteId}`
    );
  }

  getMetasPaciente(pacienteId: number, page = 0, size = 10): Observable<any> {
    return this.http.get<any>(
      `${this.base}/metas/paciente/${pacienteId}?page=${page}&size=${size}`
    );
  }
}
