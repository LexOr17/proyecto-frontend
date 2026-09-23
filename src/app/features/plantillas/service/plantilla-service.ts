import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Plantilla, PlantillaRequest } from '../interfaces/plantilla.interface';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { Page } from '../../../shared/interfaces/page.interface';

@Injectable({
  providedIn: 'root',
})
export class PlantillaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/plantillas`;

  crearPlantilla(request: PlantillaRequest): Observable<ApiResponse<Plantilla>> {
    return this.http.post<ApiResponse<Plantilla>>(this.baseUrl, request);
  }

  obtenerPlantillaPorId(id: number): Observable<Plantilla | null> {
    return this.http
      .get<ApiResponse<Plantilla>>(`${this.baseUrl}/${id}`)
      .pipe(map((r) => r.datos));
  }

  actualizarPlantilla(id: number, request: PlantillaRequest): Observable<ApiResponse<Plantilla>> {
    return this.http.put<ApiResponse<Plantilla>>(`${this.baseUrl}/${id}`, request);
  }

  obtenerPlantillas(page = 0, size = 6): Observable<Page<Plantilla> | null> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiResponse<Page<Plantilla>>>(this.baseUrl, { params })
      .pipe(map((r) => r.datos));
  }

  buscarPlantillas(keyword: string, categoria = '', page = 0, size = 6): Observable<Page<Plantilla> | null> {
    const params = new HttpParams()
      .set('keyword', keyword)
      .set('categoria', categoria)
      .set('page', page)
      .set('size', size);
    return this.http
      .get<ApiResponse<Page<Plantilla>>>(`${this.baseUrl}/buscar`, { params })
      .pipe(map((r) => r.datos));
  }

  eliminarPlantilla(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/${id}`);
  }
}
