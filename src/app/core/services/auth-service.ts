import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthResponse, UserRole } from '../interfaces/auth-response';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // Dependencias
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Configuración
  private readonly baseUrl = `${environment.baseUrl}/login`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly ROLE_KEY = 'user_role';

  // 1. Inicialización de estado (Lectura directa de localStorage)
  // Al no haber SSR, esto es seguro de ejecutar en el constructor/inicialización
  private readonly _token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  // Ojo: casteamos con cuidado. Si no existe, es null.
  private readonly _currentUserRole = signal<UserRole | null>(
    (localStorage.getItem(this.ROLE_KEY) as UserRole) || null
  );

  // 2. Estado Público (Solo Lectura para los componentes)
  public readonly token = this._token.asReadonly();
  public readonly currentUserRole = this._currentUserRole.asReadonly();

  // 3. Computed State
  public readonly isAuthenticated = computed(() => !!this.token());

  login(credentials: { correo: string; contrasena: string }) {
    return this.http.post<AuthResponse>(this.baseUrl, credentials).pipe(
      tap(response => {
        if (response.estatus === 200 && response.datos) {
          this.setSession(response.datos.token, response.datos.rol as UserRole);
        }
      })
    );
  }

  logout() {
    // 1. Limpiar estado reactivo
    this._token.set(null);
    this._currentUserRole.set(null);

    // 2. Limpiar persistencia
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);

    // 3. Redirigir
    this.router.navigate(['/auth/login']);
  }

  recoverPassword(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/recuperar-contrasena`, { email });
  }

  hasRole(allowedRoles: UserRole[]): boolean {
    const currentRole = this.currentUserRole();
    return currentRole ? allowedRoles.includes(currentRole) : false;
  }

  private setSession(token: string, role: UserRole) {
    // Actualizamos Signals
    this._token.set(token);
    this._currentUserRole.set(role);

    // Actualizamos LocalStorage
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.ROLE_KEY, role);
  }

}
