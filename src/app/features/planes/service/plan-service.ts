import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { PlanAlimenticioRequest, PlanAlimenticioResponse } from '../interfaces/plan.interface';

@Injectable({ providedIn: 'root' })
export class PlanAlimenticioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/planes-alimenticios`;

  crearPlan(request: PlanAlimenticioRequest): Observable<ApiResponse<PlanAlimenticioResponse>> {
    return this.http.post<ApiResponse<PlanAlimenticioResponse>>(this.baseUrl, request);
  }

  obtenerPlanPorId(id: number): Observable<ApiResponse<PlanAlimenticioResponse>> {
    return this.http.get<ApiResponse<PlanAlimenticioResponse>>(`${this.baseUrl}/${id}`);
  }

  obtenerPlanesDePaciente(pacienteId: number): Observable<ApiResponse<PlanAlimenticioResponse[]>> {
    return this.http.get<ApiResponse<PlanAlimenticioResponse[]>>(`${this.baseUrl}/paciente/${pacienteId}`);
  }

  actualizarPlan(id: number, request: PlanAlimenticioRequest): Observable<ApiResponse<PlanAlimenticioResponse>> {
    return this.http.put<ApiResponse<PlanAlimenticioResponse>>(`${this.baseUrl}/${id}`, request);
  }

  eliminarPlan(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
