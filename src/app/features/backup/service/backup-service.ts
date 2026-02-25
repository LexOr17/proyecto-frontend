import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BackupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/backup`;

  descargarBackup(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/descarga`, {
      responseType: 'blob',
    });
  }

  restaurarBackup(file: File): Observable<void> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<void>(`${this.baseUrl}/restaurar`, formData);
  }
}
