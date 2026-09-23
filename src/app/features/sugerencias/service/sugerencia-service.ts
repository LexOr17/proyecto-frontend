import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { Page } from '../../../shared/interfaces/page.interface';
import {
  Sugerencia,
  SugerenciaRequest,
  SugerenciaRevision,
} from '../interfaces/sugerencia.interface';
import { Plantilla } from '../../plantillas/interfaces/plantilla.interface';

@Injectable({ providedIn: 'root' })
export class SugerenciaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/sugerencias-plantilla`;

  // ── PACIENTE ────────────────────────────────────────────────

  enviarSugerencia(request: SugerenciaRequest): Observable<ApiResponse<Sugerencia>> {
    return this.http.post<ApiResponse<Sugerencia>>(this.baseUrl, request);
  }

  obtenerPlantillasDelPlanActual(): Observable<Plantilla[]> {
    return this.http
      .get<ApiResponse<Plantilla[]>>(`${this.baseUrl}/mis-plantillas-plan`)
      .pipe(map((r) => r.datos ?? []));
  }

  obtenerMisSugerencias(page = 0, size = 10, estado?: string): Observable<Page<Sugerencia> | null> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http
      .get<ApiResponse<Page<Sugerencia>>>(`${this.baseUrl}/mis-sugerencias`, { params })
      .pipe(map((r) => r.datos));
  }

  actualizarSugerencia(id: number, request: SugerenciaRequest): Observable<ApiResponse<Sugerencia>> {
    return this.http.put<ApiResponse<Sugerencia>>(`${this.baseUrl}/${id}`, request);
  }

  cancelarSugerencia(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  // ── NUTRIÓLOGO ──────────────────────────────────────────────

  obtenerTodasParaNutriologo(page = 0, size = 10): Observable<Page<Sugerencia> | null> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<Page<Sugerencia>>>(`${this.baseUrl}/nutriologo/todas`, { params })
      .pipe(map((r) => r.datos));
  }

  obtenerPendientesParaNutriologo(page = 0, size = 10): Observable<Page<Sugerencia> | null> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<Page<Sugerencia>>>(`${this.baseUrl}/nutriologo/pendientes`, { params })
      .pipe(map((r) => r.datos));
  }

  revisarSugerencia(id: number, revision: SugerenciaRevision): Observable<ApiResponse<Sugerencia>> {
    return this.http.patch<ApiResponse<Sugerencia>>(`${this.baseUrl}/${id}/revisar`, revision);
  }

  // ── COMPARTIDO ──────────────────────────────────────────────

  obtenerPorId(id: number): Observable<Sugerencia | null> {
    return this.http
      .get<ApiResponse<Sugerencia>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.datos));
  }
}
