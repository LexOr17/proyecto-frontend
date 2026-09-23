import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { Page } from '../../../shared/interfaces/page.interface';
import {
  DiarioExtendidoPacienteRequest,
  DiarioExtendidoNutriologoRequest,
  DiarioExtendidoResponse,
} from '../interfaces/diario-extendido.interface';

@Injectable({ providedIn: 'root' })
export class DiarioExtendidoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/diario-extendido`;

  registrarDiario(dto: DiarioExtendidoPacienteRequest): Observable<DiarioExtendidoResponse> {
    return this.http
      .post<ApiResponse<DiarioExtendidoResponse>>(this.baseUrl, dto)
      .pipe(map(r => r.datos!));
  }

  obtenerMiDiarioPorFecha(fecha: string): Observable<DiarioExtendidoResponse | null> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http
      .get<ApiResponse<DiarioExtendidoResponse>>(`${this.baseUrl}/mi-diario`, { params })
      .pipe(
        map(r => r.datos ?? null),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) return of(null);
          return throwError(() => err);
        }),
      );
  }

  programarSugerencia(
    pacienteId: number,
    fecha: string,
    dto: DiarioExtendidoNutriologoRequest,
  ): Observable<DiarioExtendidoResponse> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http
      .patch<ApiResponse<DiarioExtendidoResponse>>(
        `${this.baseUrl}/pacientes/${pacienteId}/sugerencia`,
        dto,
        { params },
      )
      .pipe(map(r => r.datos!));
  }

  listarHistorialPaciente(
    pacienteId: number,
    page = 0,
    size = 10,
  ): Observable<Page<DiarioExtendidoResponse>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'fecha,desc');
    return this.http
      .get<ApiResponse<Page<DiarioExtendidoResponse>>>(
        `${this.baseUrl}/pacientes/${pacienteId}`,
        { params },
      )
      .pipe(map(r => r.datos!));
  }

  eliminarDiario(diarioId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${diarioId}`)
      .pipe(map(() => undefined));
  }
}
