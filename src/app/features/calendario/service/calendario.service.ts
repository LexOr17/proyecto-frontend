import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import {
  CalendarioDiaNutriologoResponse,
  CalendarioDiaPacienteResponse,
  CalendarioMesNutriologoResponse,
  CalendarioMesPacienteResponse,
} from '../interfaces/calendario.interface';

@Injectable({ providedIn: 'root' })
export class CalendarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/calendario`;

  // ─── Nutriólogo ─────────────────────────────────────────────────────────────

  getMesNutriologo(year: number, month: number): Observable<CalendarioMesNutriologoResponse> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http
      .get<ApiResponse<CalendarioMesNutriologoResponse>>(`${this.baseUrl}/nutriologo/mes`, { params })
      .pipe(map(r => r.datos!));
  }

  getDiaNutriologo(fecha: string): Observable<CalendarioDiaNutriologoResponse> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http
      .get<ApiResponse<CalendarioDiaNutriologoResponse>>(`${this.baseUrl}/nutriologo/dia`, { params })
      .pipe(map(r => r.datos!));
  }

  // ─── Paciente ───────────────────────────────────────────────────────────────

  getMesPaciente(year: number, month: number): Observable<CalendarioMesPacienteResponse> {
    const params = new HttpParams().set('year', year).set('month', month);
    return this.http
      .get<ApiResponse<CalendarioMesPacienteResponse>>(`${this.baseUrl}/paciente/mes`, { params })
      .pipe(map(r => r.datos!));
  }

  getDiaPaciente(fecha: string): Observable<CalendarioDiaPacienteResponse> {
    const params = new HttpParams().set('fecha', fecha);
    return this.http
      .get<ApiResponse<CalendarioDiaPacienteResponse>>(`${this.baseUrl}/paciente/dia`, { params })
      .pipe(map(r => r.datos!));
  }
}
