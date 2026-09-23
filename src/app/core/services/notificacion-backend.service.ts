import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injectable,
  NgZone,
  Signal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { filter, interval, Subject, Subscription, switchMap } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth-service';
import { NotificationService } from '../../shared/service/notification-service';
import { NotificacionBackend } from '../interfaces/notificacion-backend.interface';
import { Page } from '../../shared/interfaces/page.interface';

/** Intervalo de polling en milisegundos para refrescar el conteo de no leídas (10s de respaldo). */
const POLLING_INTERVAL_MS = 10_000;

/**
 * Servicio encargado de la gestión integral de notificaciones del sistema.
 *
 * Estrategia dual para actualización del badge en tiempo real:
 *
 * 1. WebSocket (STOMP): actualización inmediata (0 ms) cuando el backend entrega
 *    el mensaje en tiempo real al destino /user/queue/notificaciones.
 *
 * 2. Polling REST (fallback garantizado): cada 10 segundos y en cada cambio de ruta
 *    se consulta el conteo de no leídas.
 *
 * El Subject `conteoActualizado$` se emite en ambos casos. El componente
 * NotificationBell se suscribe a él y llama detectChanges() para forzar
 * la re-renderización de forma síncrona e inmediata.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionBackendService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  private readonly baseUrl = `${environment.baseUrl}/api/notificaciones`;
  private stompClient: Client | null = null;
  private pollingSubscription?: Subscription;

  private readonly _notificaciones = signal<NotificacionBackend[]>([]);
  private readonly _noLeidasCount = signal<number>(0);
  private readonly _cargando = signal<boolean>(false);

  /**
   * Subject que emite cada vez que el conteo de no leídas cambia,
   * ya sea por WebSocket, navegación o por polling.
   */
  private readonly _conteoActualizado$ = new Subject<void>();

  readonly notificaciones: Signal<NotificacionBackend[]> = this._notificaciones.asReadonly();
  readonly noLeidasCount: Signal<number> = this._noLeidasCount.asReadonly();
  readonly cargando: Signal<boolean> = this._cargando.asReadonly();
  readonly tienePendientes: Signal<boolean> = computed(() => this._noLeidasCount() > 0);

  /** El componente NotificationBell se suscribe a esto para forzar su re-renderización. */
  readonly conteoActualizado$ = this._conteoActualizado$.asObservable();

  constructor() {
    // Reacciona al token de sesión para conectar WebSocket y cargar datos
    effect(
      () => {
        const token = this.authService.token();
        if (token) {
          this.conectar(token);
          this.cargarConteoNoLeidas();
          this.cargarNotificaciones();
          this.iniciarPolling();
        } else {
          this.desconectar();
          this._notificaciones.set([]);
          this._noLeidasCount.set(0);
        }
      },
      { allowSignalWrites: true }
    );

    // Refresca el conteo automáticamente cada vez que el usuario navega entre pantallas
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.cargarConteoNoLeidas();
      });
  }

  // ── REST API ───────────────────────────────────────────────────────

  cargarNotificaciones(page = 0, size = 20): void {
    if (!this.authService.token()) return;
    this._cargando.set(true);
    this.http
      .get<Page<NotificacionBackend>>(`${this.baseUrl}?page=${page}&size=${size}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this._notificaciones.set(resp.content);
          this._cargando.set(false);
        },
        error: () => this._cargando.set(false),
      });
  }

  cargarConteoNoLeidas(): void {
    if (!this.authService.token()) return;
    this.http
      .get<{ count: number }>(`${this.baseUrl}/no-leidas/count`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resp) => {
          this._noLeidasCount.set(resp.count);
          this._conteoActualizado$.next();
        },
      });
  }

  marcarComoLeida(notificacionUsuarioId: number): void {
    this.http
      .patch<void>(`${this.baseUrl}/${notificacionUsuarioId}/leer`, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this._notificaciones.update((lista) =>
          lista.map((n) =>
            n.notificacionUsuarioId === notificacionUsuarioId ? { ...n, leida: true } : n
          )
        );
        this._noLeidasCount.update((count) => Math.max(0, count - 1));
        this._conteoActualizado$.next();
      });
  }

  marcarTodasComoLeidas(): void {
    this.http
      .patch<void>(`${this.baseUrl}/leer-todas`, {})
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this._notificaciones.update((lista) => lista.map((n) => ({ ...n, leida: true })));
        this._noLeidasCount.set(0);
        this._conteoActualizado$.next();
      });
  }

  abrirNotificacion(notificacion: NotificacionBackend): void {
    if (!notificacion.leida) {
      this.marcarComoLeida(notificacion.notificacionUsuarioId);
    }
    if (notificacion.actionUrl) {
      this.router.navigateByUrl(notificacion.actionUrl);
    }
  }

  // ── Polling (fallback garantizado) ─────────────────────────────────

  /**
   * Inicia un ciclo de polling cada 30 segundos para refrescar el conteo
   * de notificaciones no leídas. Sirve como fallback garantizado para cuando
   * el WebSocket no entrega mensajes en tiempo real.
   * Es seguro llamar a este método múltiples veces: interval siempre crea
   * una nueva suscripción que se destruye con el mismo destroyRef.
   */
  private iniciarPolling(): void {
    this.pollingSubscription?.unsubscribe();

    this.pollingSubscription = interval(POLLING_INTERVAL_MS)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(() => !!this.authService.token()),
        switchMap(() =>
          this.http.get<{ count: number }>(`${this.baseUrl}/no-leidas/count`)
        )
      )
      .subscribe({
        next: (resp) => {
          this._noLeidasCount.set(resp.count);
          this._conteoActualizado$.next();
          console.log('[NotificacionPolling] 🔄 Conteo actualizado:', resp.count);
        },
        error: () => {}, // Ignorar errores de red en polling
      });
  }

  // ── WebSocket / STOMP ──────────────────────────────────────────────

  private conectar(token: string): void {
    if (this.stompClient?.connected) {
      console.log('[NotificacionWS] Ya conectado, omitiendo reconexión.');
      return;
    }
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }

    console.log('[NotificacionWS] Iniciando conexión WebSocket...');

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.baseUrl}/ws`) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[NotificacionWS] ✅ Conectado.');
        this.stompClient!.subscribe('/user/queue/notificaciones', (msg: IMessage) => {
          this.ngZone.run(() => this.onMensajeRecibido(msg));
        });
        console.log('[NotificacionWS] 📡 Suscrito a /user/queue/notificaciones');
      },
      onStompError: (frame) => {
        console.error('[NotificacionWS] ❌ Error STOMP:', frame.headers['message']);
      },
      onWebSocketError: (event) => {
        console.error('[NotificacionWS] ❌ Error red WebSocket:', event);
      },
      onDisconnect: () => {
        console.log('[NotificacionWS] 🔌 Desconectado.');
      },
    });

    this.stompClient.activate();
  }

  private desconectar(): void {
    this.pollingSubscription?.unsubscribe();
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
  }

  private onMensajeRecibido(msg: IMessage): void {
    // Siempre se llama dentro de ngZone.run()
    try {
      console.log('[NotificacionWS] 🔔 Mensaje recibido:', msg.body);
      const notificacion: NotificacionBackend = JSON.parse(msg.body);

      this._notificaciones.update((lista) => {
        const existe = lista.some(
          (n) => n.notificacionUsuarioId === notificacion.notificacionUsuarioId
        );
        return existe ? lista : [notificacion, ...lista];
      });

      this._noLeidasCount.update((count) => count + 1);

      // Emitir para que el componente ejecute detectChanges() de forma síncrona
      this._conteoActualizado$.next();

      const textoToast = notificacion.mensaje
        ? `${notificacion.titulo}: ${notificacion.mensaje}`
        : notificacion.titulo;
      this.notificationService.info(textoToast);
    } catch (e) {
      console.error('[NotificacionWS] Error procesando mensaje:', e);
    }
  }
}
