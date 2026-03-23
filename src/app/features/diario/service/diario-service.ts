import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import {
  DiarioComidaRequest,
  DiarioComidaResponse,
  ObservacionRequest,
} from '../interfaces/diario.interface';

@Injectable({ providedIn: 'root' })
export class DiarioComidaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/diario-comida`;

  registrar(dto: DiarioComidaRequest): Observable<DiarioComidaResponse> {
    return this.http
      .post<ApiResponse<DiarioComidaResponse>>(this.baseUrl, dto)
      .pipe(map(r => r.datos!));
  }

  actualizar(id: number, dto: DiarioComidaRequest): Observable<DiarioComidaResponse> {
    return this.http
      .put<ApiResponse<DiarioComidaResponse>>(`${this.baseUrl}/${id}`, dto)
      .pipe(map(r => r.datos!));
  }

  obtenerMiHistorial(): Observable<DiarioComidaResponse[]> {
    return this.http
      .get<ApiResponse<DiarioComidaResponse[]>>(`${this.baseUrl}/mi-historial`)
      .pipe(map(r => r.datos ?? []));
  }

  obtenerHistorialPorPaciente(pacienteId: number): Observable<DiarioComidaResponse[]> {
    return this.http
      .get<ApiResponse<DiarioComidaResponse[]>>(`${this.baseUrl}/paciente/${pacienteId}`)
      .pipe(map(r => r.datos ?? []));
  }

  agregarObservacion(id: number, dto: ObservacionRequest): Observable<DiarioComidaResponse> {
    return this.http
      .patch<ApiResponse<DiarioComidaResponse>>(`${this.baseUrl}/${id}/observacion`, dto)
      .pipe(map(r => r.datos!));
  }

  eliminar(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }
}
