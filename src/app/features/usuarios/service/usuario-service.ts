import { ApiResponse } from './../../../core/interfaces/auth-response';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { map, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Usuario, UsuarioRequest, Dato } from '../interfaces/usuario-request';
import { Page } from '../../../shared/interfaces/page.interface';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  registrarUsuario(usuario: UsuarioRequest): Observable<ApiResponse<Usuario>> {
    return this.http.post<ApiResponse<Usuario>>(`${this.baseUrl}/usuarios/registro`, usuario);
  }

  obtenerUsuarios(page = 0, size = 10): Observable<Page<Usuario> | null> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);

    return this.http.get<ApiResponse<Page<Usuario>>>(`${this.baseUrl}/usuarios`, { params })
      .pipe(
        map(response => response.datos)
      );
  }

  eliminarUsuario(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${this.baseUrl}/usuarios/${id}`);
  }

  obtenerUsuarioPorId(id: number): Observable<Usuario | null> {
    return this.http.get<ApiResponse<Usuario>>(`${this.baseUrl}/usuarios/${id}`)
      .pipe(
        map(response => response.datos)
      );
  }

  actualizarUsuario(id: number, usuario: UsuarioRequest): Observable<ApiResponse<Usuario>> {
    return this.http.put<ApiResponse<Usuario>>(`${this.baseUrl}/usuarios/${id}`, usuario);
  }

  obtenerNutriologos(): Observable<Dato[] | null> {
    return this.http.get<ApiResponse<Dato[]>>(`${this.baseUrl}/nutriologos/selector`)
      .pipe(
        map(response => response.datos)
      );
  }

}
