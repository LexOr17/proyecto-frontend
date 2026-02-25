import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Alimento, ApiResponse } from '../interfaces/alimento.interface';
import { Page } from '../../../shared/interfaces/page.interface';

@Injectable({
  providedIn: 'root',
})
export class AlimentoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/alimentos`;

  registrarAlimento(formData: FormData): Observable<ApiResponse<Alimento>> {
    console.log('[AlimentoService] Registrando alimento con datos:', formData);
    return this.http.post<ApiResponse<Alimento>>(this.baseUrl, formData);
  }

  obtenerAlimentos(page = 0, size = 10): Observable<Page<Alimento>> {
    const params = new HttpParams().set('page', page).set('size', size);

    return this.http
      .get<ApiResponse<Page<Alimento>>>(this.baseUrl, { params })
      .pipe(map((response) => response.datos));
  }

  obtenerAlimentoPorId(id: number): Observable<Alimento> {
    return this.http
      .get<ApiResponse<Alimento>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.datos));
  }

  obtenerAlimentosPorCategoria(categoria: string): Observable<Alimento[]> {
    return this.http
      .get<ApiResponse<Alimento[]>>(`${this.baseUrl}/categoria/${categoria}`)
      .pipe(map((response) => response.datos));
  }

  actualizarAlimento(id: number, formData: FormData): Observable<ApiResponse<Alimento>> {
    console.log('[AlimentoService] Actualizando alimento con id:', id, 'y datos:', formData);
    return this.http.put<ApiResponse<Alimento>>(`${this.baseUrl}/${id}`, formData);
  }

  eliminarAlimento(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
