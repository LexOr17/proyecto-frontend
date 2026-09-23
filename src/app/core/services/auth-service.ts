import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, AuthResponse, UserRole } from '../interfaces/auth-response';

/**
 * Servicio central de autenticación y gestión del estado de sesión del usuario en la aplicación (`AuthService`).
 *
 * ### Responsabilidades Principales:
 * - **Gestión de Estado Reactivo**: Utiliza Angular Signals (`signal`, `computed`) para mantener un estado
 *   reactivo, inmutable hacia los consumidores y de alto rendimiento.
 * - **Persistencia Local**: Sincroniza de forma bidireccional el token JWT y los metadatos del perfil de usuario
 *   con el almacenamiento persistente (`localStorage`).
 * - **Control de Acceso (RBAC)**: Provee mecanismos para la validación de roles en guards y directivas de interfaz.
 * - **Flujos de Sesión**: Orquesta el inicio de sesión (`login`), cierre de sesión (`logout`) y recuperación de contraseñas.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // ── Dependencias Inyectadas ─────────────────────────────────────────
  /** Cliente HTTP de Angular para invocar los endpoints de autenticación. */
  private readonly http = inject(HttpClient);

  /** Servicio de enrutamiento para redirecciones durante el ciclo de vida de la sesión. */
  private readonly router = inject(Router);

  // ── Configuración y Claves de Persistencia ────────────────────────
  /** URL base para los endpoints de inicio de sesión y recuperación. */
  private readonly baseUrl = `${environment.baseUrl}/login`;

  /** Clave de almacenamiento en localStorage para el token JWT. */
  private readonly TOKEN_KEY = 'auth_token';

  /** Clave de almacenamiento en localStorage para el rol del usuario. */
  private readonly ROLE_KEY = 'user_role';

  /** Clave de almacenamiento en localStorage para el nombre del usuario. */
  private readonly NAME_KEY = 'user_name';

  /** Clave de almacenamiento en localStorage para los apellidos del usuario. */
  private readonly LASTNAME_KEY = 'user_lastname';

  /** Clave de almacenamiento en localStorage para el identificador numérico del usuario. */
  private readonly USER_ID_KEY = 'user_id';

  // ── Estado Reactivo Privado (Writable Signals) ─────────────────────
  /** Signal interno para almacenar el token JWT actual. Inicializado desde localStorage. */
  private readonly _token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  /** Signal interno para almacenar el rol activo del usuario. */
  private readonly _currentUserRole = signal<UserRole | null>(
    (localStorage.getItem(this.ROLE_KEY) as UserRole) || null
  );

  /** Signal interno para almacenar el nombre del usuario. */
  private readonly _userName = signal<string | null>(localStorage.getItem(this.NAME_KEY));

  /** Signal interno para almacenar los apellidos del usuario. */
  private readonly _userLastName = signal<string | null>(localStorage.getItem(this.LASTNAME_KEY));

  /** Signal interno para almacenar el ID del usuario como número. */
  private readonly _userId = signal<number | null>(
    localStorage.getItem(this.USER_ID_KEY) ? Number(localStorage.getItem(this.USER_ID_KEY)) : null
  );

  /** Bandera de control para evitar ejecuciones concurrentes o redundantes durante el logout. */
  private _isLoggingOut = false;

  // ── Estado Reactivo Público (Readonly Signals) ──────────────────────
  /** Token JWT de solo lectura emitido por el backend para autorizar peticiones. */
  public readonly token = this._token.asReadonly();

  /** Rol asignado al usuario actual (ADMINISTRADOR, NUTRIOLOGO, PACIENTE) o `null` si no hay sesión. */
  public readonly currentUserRole = this._currentUserRole.asReadonly();

  /** Nombre del usuario autenticado o `null`. */
  public readonly userName = this._userName.asReadonly();

  /** Apellidos del usuario autenticado o `null`. */
  public readonly userLastName = this._userLastName.asReadonly();

  /** Identificador numérico del usuario autenticado en la base de datos o `null`. */
  public readonly userId = this._userId.asReadonly();

  /**
   * Signal computado que concatena el nombre y apellido del usuario.
   * Retorna 'Usuario' como valor por defecto si no existen datos cargados.
   */
  public readonly userFullName: Signal<string> = computed(() => {
    const name = this._userName();
    const lastName = this._userLastName();
    return [name, lastName].filter(Boolean).join(' ') || 'Usuario';
  });

  /**
   * Signal computado que genera las iniciales (1 o 2 letras mayúsculas) para mostrar en avatars y cabeceras.
   * Retorna 'U' si no hay nombre ni apellido disponible.
   */
  public readonly userInitials: Signal<string> = computed(() => {
    const name = this._userName();
    const lastName = this._userLastName();
    const first = name?.charAt(0).toUpperCase() ?? '';
    const last = lastName?.charAt(0).toUpperCase() ?? '';
    return (first + last) || 'U';
  });

  /**
   * Signal computado que evalúa si existe una sesión activa y autenticada verificando la presencia del token.
   */
  public readonly isAuthenticated: Signal<boolean> = computed(() => !!this.token());

  // ── Métodos de Autenticación y Sesión ──────────────────────────────

  /**
   * Autentica las credenciales de un usuario contra el endpoint del backend.
   * Si la respuesta es exitosa (código 200), persiste automáticamente los datos de sesión y el token.
   *
   * @param credentials - Objeto con el correo electrónico y la contraseña del usuario.
   * @returns Observable con la respuesta completa de autenticación `AuthResponse`.
   */
  login(credentials: { correo: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.baseUrl, credentials).pipe(
      tap(response => {
        if (response.estatus === 200 && response.datos) {
          const { token, rol, nombre, apellidos, id } = response.datos;
          this.setSession(token, rol as UserRole, nombre, apellidos, id);
        }
      })
    );
  }

  /**
   * Cierra la sesión activa del usuario:
   * 1. Restablece todos los signals de estado a `null`.
   * 2. Remueve las claves persistidas en `localStorage`.
   * 3. Redirige al usuario a la pantalla de inicio de sesión (`/auth/login`).
   */
  logout(): void {
    if (this._isLoggingOut) return;
    this._isLoggingOut = true;

    // 1. Limpiar estado reactivo en memoria
    this._token.set(null);
    this._currentUserRole.set(null);
    this._userName.set(null);
    this._userLastName.set(null);
    this._userId.set(null);

    // 2. Limpiar persistencia local
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.NAME_KEY);
    localStorage.removeItem(this.LASTNAME_KEY);
    localStorage.removeItem(this.USER_ID_KEY);

    // 3. Redirigir a vista de login
    this.router.navigate(['/auth/login']).then(() => {
      this._isLoggingOut = false;
    });
  }

  /**
   * Solicita el restablecimiento o recuperación de contraseña para un correo electrónico registrado.
   *
   * @param email - Correo electrónico asociado a la cuenta de usuario.
   * @returns Observable con la respuesta de confirmación del servidor `ApiResponse<string>`.
   */
  recoverPassword(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/recuperar-contrasena`, { email });
  }

  /**
   * Comprueba si el rol del usuario autenticado pertenece a una lista de roles permitidos.
   *
   * @param allowedRoles - Arreglo de roles válidos para autorizar el acceso o acción.
   * @returns `true` si el rol del usuario está incluido en la lista, de lo contrario `false`.
   */
  hasRole(allowedRoles: UserRole[]): boolean {
    const currentRole = this.currentUserRole();
    return currentRole ? allowedRoles.includes(currentRole) : false;
  }

  /**
   * Establece y sincroniza el estado de la sesión tanto en los signals reactivos como en el almacenamiento local.
   *
   * @param token - Token JWT de autenticación.
   * @param role - Rol asignado al usuario.
   * @param nombre - Nombre de pila del usuario.
   * @param apellidos - Apellidos del usuario.
   * @param id - Identificador único del usuario (en formato string o número).
   */
  private setSession(token: string, role: UserRole, nombre: string, apellidos: string, id: string): void {
    const userId = Number(id);
    this._isLoggingOut = false;

    // Actualizamos Signals reactivos
    this._token.set(token);
    this._currentUserRole.set(role);
    this._userName.set(nombre);
    this._userLastName.set(apellidos);
    this._userId.set(isNaN(userId) ? null : userId);

    // Actualizamos almacenamiento persistente
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.ROLE_KEY, role);
    if (nombre) localStorage.setItem(this.NAME_KEY, nombre);
    if (apellidos) localStorage.setItem(this.LASTNAME_KEY, apellidos);
    if (!isNaN(userId)) localStorage.setItem(this.USER_ID_KEY, String(userId));
  }

}
