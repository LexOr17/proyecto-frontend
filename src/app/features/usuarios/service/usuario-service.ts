import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { map, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Usuario, Dato, SelectorNutiologos } from '../interfaces/usuario-request';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private http = inject(HttpClient);
  private baseUrl = environment.baseUrl;

  registrarUsuario(usuario: Usuario): Observable<any> {
    return this.http.post(`${this.baseUrl}/usuarios/registro`, usuario);
  }

  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<{ datos: Usuario[] }>(`${this.baseUrl}/usuarios`)
    .pipe(
      map(response => response.datos)
    );
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/usuarios/${id}`);
  }

  obtenerNutriologos(): Observable<Dato[]> {
    return this.http.get<SelectorNutiologos>(`${this.baseUrl}/nutriologos/selector`)
    .pipe(
      map(response => response.datos)
    );
  }

}
