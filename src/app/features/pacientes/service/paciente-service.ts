import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { Paciente, PacienteRequest } from '../interfaces/paciente.interface';
import { Page } from '../../../shared/interfaces/page.interface';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/nutriologos/pacientes`;

  registrarPaciente(paciente: PacienteRequest): Observable<ApiResponse<Paciente>> {
    return this.http.post<ApiResponse<Paciente>>(this.baseUrl, paciente);
  }

  obtenerPacientes(page = 0, size = 10): Observable<Page<Paciente>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<ApiResponse<Page<Paciente>>>(this.baseUrl, { params })
      .pipe(map(response => response.datos!));
  }

  obtenerPacientePorId(id: number): Observable<Paciente> {
    return this.http.get<ApiResponse<Paciente>>(`${this.baseUrl}/${id}`)
      .pipe(map(response => response.datos!));
  }

  actualizarPaciente(id: number, paciente: PacienteRequest): Observable<ApiResponse<Paciente>> {
    return this.http.put<ApiResponse<Paciente>>(`${this.baseUrl}/${id}`, paciente);
  }

  eliminarPaciente(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
