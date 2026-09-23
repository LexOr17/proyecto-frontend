import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { MetaEstadoRequest, MetaRequest, MetaResponse, MetaStatusCount } from '../interfaces/meta.interface';
import { Page } from '../../../shared/interfaces/page.interface';

@Injectable({ providedIn: 'root' })
export class MetaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/metas`;

  crearMeta(request: MetaRequest): Observable<MetaResponse> {
    return this.http
      .post<ApiResponse<MetaResponse>>(this.baseUrl, request)
      .pipe(map(r => r.datos!));
  }

  listarMetasPorPaciente(pacienteId: number, page = 0, size = 5): Observable<Page<MetaResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<Page<MetaResponse>>>(`${this.baseUrl}/paciente/${pacienteId}`, { params })
      .pipe(map(r => r.datos!));
  }

  actualizarMeta(id: number, request: MetaRequest): Observable<MetaResponse> {
    return this.http
      .put<ApiResponse<MetaResponse>>(`${this.baseUrl}/${id}`, request)
      .pipe(map(r => r.datos!));
  }

  eliminarMeta(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }

  actualizarEstado(id: number, request: MetaEstadoRequest): Observable<MetaResponse> {
    return this.http
      .patch<ApiResponse<MetaResponse>>(`${this.baseUrl}/${id}/estado`, request)
      .pipe(map(r => r.datos!));
  }

  obtenerConteoMetas(pacienteId: number): Observable<MetaStatusCount> {
    return this.http
      .get<ApiResponse<MetaStatusCount>>(`${this.baseUrl}/paciente/${pacienteId}/resumen`)
      .pipe(
        map(r => {
          const d = r.datos ?? {
            pendientes: 0,
            porValidar: 0,
            cumplidas: 0,
            rechazadas: 0,
            noCumplidas: 0,
            total: 0,
            porcentaje: 0,
            porcentajeExito: 0,
          };
          const rawPct =
            d.porcentajeExito ??
            d.porcentaje ??
            (d.total > 0 ? (d.cumplidas / d.total) * 100 : 0);
          const roundedPct = Math.round(rawPct);
          return {
            ...d,
            porcentaje: roundedPct,
            porcentajeExito: rawPct,
          };
        })
      );
  }
}
