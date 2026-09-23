import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/interfaces/auth-response';
import { Paciente, PacienteRequest } from '../interfaces/paciente.interface';
import { Page } from '../../../shared/interfaces/page.interface';

/**
 * Servicio encargado de las operaciones CRUD y gestión de pacientes (`PacienteService`).
 */
@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/nutriologos/pacientes`;

  /**
   * Registra un nuevo paciente en el sistema.
   *
   * @param paciente - Datos del formulario de registro del paciente.
   * @returns Observable con la respuesta de creación y la entidad registrada.
   */
  registrarPaciente(paciente: PacienteRequest): Observable<ApiResponse<Paciente>> {
    return this.http.post<ApiResponse<Paciente>>(this.baseUrl, paciente);
  }

  /**
   * Obtiene el listado paginado de pacientes asignados al nutriólogo autenticado.
   *
   * @param page - Índice de la página solicitada (por defecto 0).
   * @param size - Cantidad de registros por página (por defecto 10).
   * @returns Observable con la estructura de paginación `Page<Paciente>`.
   */
  obtenerPacientes(page = 0, size = 10): Observable<Page<Paciente>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<ApiResponse<Page<Paciente>>>(this.baseUrl, { params })
      .pipe(map(response => response.datos!));
  }

  /**
   * Consulta el expediente o detalle de un paciente por su identificador.
   *
   * @param id - Identificador único del paciente.
   * @returns Observable con los datos del paciente encontrado.
   */
  obtenerPacientePorId(id: number): Observable<Paciente> {
    return this.http.get<ApiResponse<Paciente>>(`${this.baseUrl}/${id}`)
      .pipe(map(response => response.datos!));
  }

  /**
   * Actualiza la información del expediente de un paciente existente.
   *
   * @param id - Identificador único del paciente a modificar.
   * @param paciente - Objeto con los datos actualizados.
   * @returns Observable con la entidad modificada.
   */
  actualizarPaciente(id: number, paciente: PacienteRequest): Observable<ApiResponse<Paciente>> {
    return this.http.put<ApiResponse<Paciente>>(`${this.baseUrl}/${id}`, paciente);
  }

  /**
   * Elimina un paciente del sistema según su identificador.
   *
   * @param id - Identificador único del paciente a dar de baja.
   * @returns Observable con la confirmación de eliminación.
   */
  eliminarPaciente(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
