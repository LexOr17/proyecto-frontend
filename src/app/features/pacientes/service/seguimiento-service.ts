import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { Page } from '../../../shared/interfaces/page.interface';
import {
  ActualizarObservacionesRequest,
  CrearSeguimientoRequest,
  SeguimientoConsulta,
  SeguimientoPreview
} from '../interfaces/seguimiento.interface';

@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/seguimiento`;

  listarPorPaciente(pacienteId: number, page = 0, size = 10): Observable<Page<SeguimientoConsulta>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<Page<SeguimientoConsulta>>>(`${this.baseUrl}/paciente/${pacienteId}`, { params })
      .pipe(map(r => r.datos!));
  }

  misSeguimientos(page = 0, size = 10): Observable<Page<SeguimientoConsulta>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<Page<SeguimientoConsulta>>>(`${this.baseUrl}/mis-seguimientos`, { params })
      .pipe(map(r => r.datos!));
  }

  listarTodos(page = 0, size = 10): Observable<Page<SeguimientoConsulta>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<Page<SeguimientoConsulta>>>(`${this.baseUrl}/todos`, { params })
      .pipe(map(r => r.datos!));
  }

  obtenerPorId(id: number): Observable<SeguimientoConsulta> {
    return this.http
      .get<ApiResponse<SeguimientoConsulta>>(`${this.baseUrl}/${id}`)
      .pipe(map(r => r.datos!));
  }

  obtenerPreview(pacienteId: number, fechaInicio: string, fechaFin: string): Observable<SeguimientoPreview> {
    const params = new HttpParams()
      .set('pacienteId', pacienteId)
      .set('fechaInicio', fechaInicio)
      .set('fechaFin', fechaFin);
    return this.http
      .get<ApiResponse<SeguimientoPreview>>(`${this.baseUrl}/preview`, { params })
      .pipe(map(r => r.datos!));
  }

  crear(request: CrearSeguimientoRequest): Observable<SeguimientoConsulta> {
    return this.http
      .post<ApiResponse<SeguimientoConsulta>>(this.baseUrl, request)
      .pipe(map(r => r.datos!));
  }

  editarObservaciones(id: number, request: ActualizarObservacionesRequest): Observable<SeguimientoConsulta> {
    return this.http
      .put<ApiResponse<SeguimientoConsulta>>(`${this.baseUrl}/${id}/observaciones`, request)
      .pipe(map(r => r.datos!));
  }

  eliminar(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined));
  }
}
