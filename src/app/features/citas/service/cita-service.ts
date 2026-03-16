import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import {
  CitaEstadoUpdateDTO,
  CitaRequest,
  CitaResponse,
  CitaSolicitudRequest,
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

  // ─── Estado (endpoint unificado) ──────────────────────────────────────────

  private actualizarEstadoCita(citaId: number, dto: CitaEstadoUpdateDTO): Observable<CitaResponse> {
    return this.http
      .patch<ApiResponse<CitaResponse>>(`${this.baseUrl}/${citaId}/estado`, dto)
      .pipe(map((r) => r.datos!));
  }

  aceptarCita(citaId: number): Observable<CitaResponse> {
    return this.actualizarEstadoCita(citaId, { nuevoEstado: 'PROGRAMADA' });
  }

  cancelarCita(citaId: number): Observable<CitaResponse> {
    return this.actualizarEstadoCita(citaId, { nuevoEstado: 'CANCELADA' });
  }

  reprogramarCita(citaId: number, nuevaFechaHoraInicio: string): Observable<CitaResponse> {
    return this.actualizarEstadoCita(citaId, {
      nuevoEstado: 'REPROGRAMACION_SOLICITADA',
      nuevaFechaHoraInicio,
    });
  }

  finalizarCita(citaId: number, asistio: boolean, observaciones?: string): Observable<CitaResponse> {
    return asistio
      ? this.actualizarEstadoCita(citaId, { nuevoEstado: 'ASISTIO', observaciones })
      : this.actualizarEstadoCita(citaId, { nuevoEstado: 'NO_ASISTIO' });
  }

  // ─── Paciente ──────────────────────────────────────────────────────────────

  solicitarCita(pacienteId: number, request: CitaSolicitudRequest): Observable<CitaResponse> {
    return this.http
      .post<ApiResponse<CitaResponse>>(`${this.baseUrl}/solicitar/${pacienteId}`, request)
      .pipe(map((r) => r.datos!));
  }

  solicitarCancelacionCita(citaId: number, motivo: string): Observable<CitaResponse> {
    return this.actualizarEstadoCita(citaId, { nuevoEstado: 'CANCELACION_SOLICITADA', motivo });
  }
}
