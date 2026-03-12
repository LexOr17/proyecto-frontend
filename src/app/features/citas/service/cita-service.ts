import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import {
  CitaRequest,
  CitaReprogramarRequest,
  CitaResponse,
  CitaSolicitudRequest,
  FinalizarCitaRequest,
} from '../interfaces/cita.interface';

@Injectable({
  providedIn: 'root',
})
export class CitaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/citas`;

  // ─── Nutriólogo ────────────────────────────────────────────────────────────

  crearCita(request: CitaRequest): Observable<CitaResponse> {
    return this.http
      .post<ApiResponse<CitaResponse>>(this.baseUrl, request)
      .pipe(map((r) => r.datos!));
  }

  obtenerTodasLasCitas(): Observable<CitaResponse[]> {
    return this.http
      .get<ApiResponse<CitaResponse[]>>(this.baseUrl)
      .pipe(map((r) => r.datos ?? []));
  }

  obtenerCitaPorId(id: number): Observable<CitaResponse> {
    return this.http
      .get<ApiResponse<CitaResponse>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.datos!));
  }

  obtenerCitasPorNutriologo(nutriologoId: number): Observable<CitaResponse[]> {
    return this.http
      .get<ApiResponse<CitaResponse[]>>(`${this.baseUrl}/nutriologo/${nutriologoId}`)
      .pipe(map((r) => r.datos ?? []));
  }

  obtenerCitasPorPaciente(pacienteId: number): Observable<CitaResponse[]> {
    return this.http
      .get<ApiResponse<CitaResponse[]>>(`${this.baseUrl}/paciente/${pacienteId}`)
      .pipe(map((r) => r.datos ?? []));
  }

  actualizarCita(id: number, request: CitaRequest): Observable<CitaResponse> {
    return this.http
      .put<ApiResponse<CitaResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map((r) => r.datos!));
  }

  eliminarCita(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }

  cancelarCita(citaId: number): Observable<CitaResponse> {
    return this.http
      .patch<ApiResponse<CitaResponse>>(`${this.baseUrl}/${citaId}/cancelar`, {})
      .pipe(map((r) => r.datos!));
  }

  reprogramarCita(citaId: number, request: CitaReprogramarRequest): Observable<CitaResponse> {
    return this.http
      .patch<ApiResponse<CitaResponse>>(`${this.baseUrl}/${citaId}/reprogramar`, request)
      .pipe(map((r) => r.datos!));
  }

  finalizarCita(citaId: number, request: FinalizarCitaRequest): Observable<CitaResponse> {
    return this.http
      .patch<ApiResponse<CitaResponse>>(`${this.baseUrl}/${citaId}/finalizar`, request)
      .pipe(map((r) => r.datos!));
  }

  // ─── Paciente ──────────────────────────────────────────────────────────────

  solicitarCita(pacienteId: number, request: CitaSolicitudRequest): Observable<CitaResponse> {
    return this.http
      .post<ApiResponse<CitaResponse>>(`${this.baseUrl}/solicitar/${pacienteId}`, request)
      .pipe(map((r) => r.datos!));
  }
}
