import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { Page } from '../../../shared/interfaces/page.interface';
import { HistorialMedicoItem, HistorialMedicoRequest } from '../interfaces/historial-medico.interface';

@Injectable({ providedIn: 'root' })
export class HistorialMedicoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/historial-medico`;

  registrar(pacienteId: number, request: HistorialMedicoRequest): Observable<HistorialMedicoItem> {
    return this.http
      .post<ApiResponse<HistorialMedicoItem>>(`${this.baseUrl}/${pacienteId}`, request)
      .pipe(map(r => r.datos!));
  }

  listar(pacienteId: number, page = 0, size = 10): Observable<Page<HistorialMedicoItem>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<Page<HistorialMedicoItem>>>(`${this.baseUrl}/paciente/${pacienteId}`, { params })
      .pipe(map(r => r.datos!));
  }

  actualizar(historialId: number, request: HistorialMedicoRequest): Observable<HistorialMedicoItem> {
    return this.http
      .put<ApiResponse<HistorialMedicoItem>>(`${this.baseUrl}/${historialId}`, request)
      .pipe(map(r => r.datos!));
  }

  eliminar(historialId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${historialId}`)
      .pipe(map(() => undefined));
  }
}
