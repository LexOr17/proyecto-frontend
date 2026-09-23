import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { MedidaAntropometrica, MedidaAntropometricaRequest } from '../interfaces/medida-antropometrica.interface';

@Injectable({
  providedIn: 'root',
})
export class MedidaAntropometricaService {
    
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/medidas`;

  registrarMedida(pacienteId: number, medida: MedidaAntropometricaRequest): Observable<ApiResponse<MedidaAntropometrica>> {
    return this.http.post<ApiResponse<MedidaAntropometrica>>(`${this.baseUrl}/${pacienteId}`, medida);
  }

  obtenerHistorial(pacienteId: number): Observable<MedidaAntropometrica[]> {
    return this.http.get<ApiResponse<MedidaAntropometrica[]>>(`${this.baseUrl}/historial/${pacienteId}`)
      .pipe(map(response => response.datos ?? []));
  }

  obtenerUltimaMedida(pacienteId: number): Observable<MedidaAntropometrica | null> {
    return this.http.get<ApiResponse<MedidaAntropometrica>>(`${this.baseUrl}/ultima/${pacienteId}`)
      .pipe(map(response => response.datos));
  }

  actualizarMedida(medidaId: number, medida: MedidaAntropometricaRequest): Observable<ApiResponse<MedidaAntropometrica>> {
    return this.http.put<ApiResponse<MedidaAntropometrica>>(`${this.baseUrl}/${medidaId}`, medida);
  }

  eliminarMedida(medidaId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${medidaId}`);
  }
}
