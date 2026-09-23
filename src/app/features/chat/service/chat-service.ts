import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth-service';
import { ChatMessageDTO } from '../interfaces/chat.interface';

/**
 * Servicio de mensajería instantánea y comunicación en tiempo real (`ChatService`).
 *
 * ### Responsabilidades Principales:
 * - **Gestión de Conexión WebSocket**: Establece y mantiene el canal bidireccional mediante el protocolo STOMP sobre SockJS.
 * - **Autenticación en Tiempo Real**: Inyecta dinámicamente el token JWT en las cabeceras de conexión (`connectHeaders`).
 * - **Suscripción a Colas Privadas**: Escucha mensajes entrantes en la cola personal del usuario autenticado (`/user/queue/messages`).
 * - **Emisión y Persistencia**: Publica mensajes hacia el broker de mensajería (`/app/chat`) y consulta el historial histórico vía REST API.
 * - **Estado Reactivo y Ciclo de Vida**: Expone el estado de conexión mediante Signals (`isConnected`) y asegura el cierre limpio con `OnDestroy`.
 */
@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  // ── Dependencias Inyectadas ─────────────────────────────────────────
  /** Cliente HTTP para la recuperación del historial de mensajes vía REST. */
  private readonly http = inject(HttpClient);

  /** Servicio de autenticación para obtener el token JWT de la sesión activa. */
  private readonly authService = inject(AuthService);

  // ── Configuración y Estado ─────────────────────────────────────────
  /** URL base para los endpoints REST del módulo de mensajería. */
  private readonly baseUrl = `${environment.baseUrl}/api/chat`;

  /** Instancia del cliente STOMP para la comunicación sobre WebSockets. */
  private stompClient: Client | null = null;

  /** Signal reactivo que indica el estado actual de la conexión WebSocket. */
  readonly isConnected = signal(false);

  // ── Métodos de Conexión y Mensajería ────────────────────────────────

  /**
   * Inicializa y activa la sesión WebSocket conectándose al broker STOMP del backend.
   * Configura la reconexión automática y se suscribe a la cola privada del usuario.
   *
   * @param onMessage - Callback invocado al recibir un nuevo mensaje entrante.
   */
  connect(onMessage: (msg: ChatMessageDTO) => void): void {
    if (this.stompClient?.connected) return;

    const token = this.authService.token();

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.baseUrl}/ws`),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        this.isConnected.set(true);
        // Spring Security enruta automáticamente /user/queue/messages al Principal autenticado
        this.stompClient!.subscribe(
          '/user/queue/messages',
          (frame: IMessage) => {
            const msg: ChatMessageDTO = JSON.parse(frame.body);
            onMessage(msg);
          },
        );
      },
      onDisconnect: () => {
        this.isConnected.set(false);
      },
    });

    this.stompClient.activate();
  }

  /**
   * Envía un mensaje instantáneo al broker WebSocket para su entrega al destinatario.
   *
   * @param message - Objeto de transferencia de datos con el contenido y metadatos del mensaje.
   */
  sendMessage(message: ChatMessageDTO): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: '/app/chat',
      body: JSON.stringify(message),
    });
  }

  /**
   * Cierra de manera controlada y ordenada la conexión con el broker STOMP.
   */
  disconnect(): void {
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
    this.isConnected.set(false);
  }

  /**
   * Obtiene el historial paginado o completo de mensajes intercambiados entre dos usuarios.
   *
   * @param senderId - Identificador único del usuario emisor.
   * @param recipientId - Identificador único del usuario receptor.
   * @returns Flujo Observable con el arreglo de mensajes recuperados.
   */
  getChatHistory(senderId: number, recipientId: number): Observable<ChatMessageDTO[]> {
    return this.http
      .get<ChatMessageDTO[]>(`${this.baseUrl}/messages/${senderId}/${recipientId}`)
      .pipe(map((msgs) => msgs ?? []));
  }

  /**
   * Hook del ciclo de vida de Angular ejecutado al destruirse el servicio,
   * asegurando la desconexión del WebSocket para prevenir fugas de memoria.
   */
  ngOnDestroy(): void {
    this.disconnect();
  }
}
