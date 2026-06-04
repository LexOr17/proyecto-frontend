import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ReporteDemografico, ReporteProgreso } from '../interfaces/reporte.interface';

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/api/reportes`;

  obtenerReporteDemografico(): Observable<ReporteDemografico> {
    return this.http.get<ReporteDemografico>(`${this.baseUrl}/demografico`);
  }

  obtenerReporteProgreso(pacienteId: number): Observable<ReporteProgreso> {
    return this.http.get<ReporteProgreso>(`${this.baseUrl}/progreso/${pacienteId}`);
  }
}
