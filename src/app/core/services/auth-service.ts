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
  private readonly NAME_KEY = 'user_name';
  private readonly LASTNAME_KEY = 'user_lastname';

  // 1. Inicialización de estado (Lectura directa de localStorage)
  // Al no haber SSR, esto es seguro de ejecutar en el constructor/inicialización
  private readonly _token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  // Ojo: casteamos con cuidado. Si no existe, es null.
  private readonly _currentUserRole = signal<UserRole | null>(
    (localStorage.getItem(this.ROLE_KEY) as UserRole) || null
  );
  private readonly _userName = signal<string | null>(localStorage.getItem(this.NAME_KEY));
  private readonly _userLastName = signal<string | null>(localStorage.getItem(this.LASTNAME_KEY));

  // 2. Estado Público (Solo Lectura para los componentes)
  public readonly token = this._token.asReadonly();
  public readonly currentUserRole = this._currentUserRole.asReadonly();
  public readonly userName = this._userName.asReadonly();
  public readonly userLastName = this._userLastName.asReadonly();
  public readonly userFullName = computed(() => {
    const name = this._userName();
    const lastName = this._userLastName();
    return [name, lastName].filter(Boolean).join(' ') || 'Usuario';
  });
  public readonly userInitials = computed(() => {
    const name = this._userName();
    const lastName = this._userLastName();
    const first = name?.charAt(0).toUpperCase() ?? '';
    const last = lastName?.charAt(0).toUpperCase() ?? '';
    return (first + last) || 'U';
  });

  // 3. Computed State
  public readonly isAuthenticated = computed(() => !!this.token());

  login(credentials: { correo: string; password: string }) {
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
    this._userName.set(null);
    this._userLastName.set(null);

    // 2. Limpiar persistencia
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.NAME_KEY);
    localStorage.removeItem(this.LASTNAME_KEY);

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
    const payload = this.decodeToken(token);
    const nombre = payload?.['nombre'] ?? null;
    const apellido = payload?.['apellido'] ?? null;

    // Actualizamos Signals
    this._token.set(token);
    this._currentUserRole.set(role);
    this._userName.set(nombre);
    this._userLastName.set(apellido);

    // Actualizamos LocalStorage
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.ROLE_KEY, role);
    if (nombre) localStorage.setItem(this.NAME_KEY, nombre);
    if (apellido) localStorage.setItem(this.LASTNAME_KEY, apellido);
  }

  private decodeToken(token: string): Record<string, string> | null {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

}
