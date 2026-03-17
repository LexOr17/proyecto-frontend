import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth-service';
import { ChatMessageDTO } from '../interfaces/chat.interface';

@Injectable({
  providedIn: 'root',
})
export class ChatService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.baseUrl}/api/chat`;

  private stompClient: Client | null = null;
  readonly isConnected = signal(false);

  connect(onMessage: (msg: ChatMessageDTO) => void): void {
    if (this.stompClient?.connected) return;

    const token = this.authService.token();

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${environment.baseUrl}/ws`),
      reconnectDelay: 5000,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        this.isConnected.set(true);
        // Spring resolves /user/queue/messages to the authenticated principal's session
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

  sendMessage(message: ChatMessageDTO): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: '/app/chat',
      body: JSON.stringify(message),
    });
  }

  disconnect(): void {
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
    this.isConnected.set(false);
  }

  getChatHistory(senderId: number, recipientId: number): Observable<ChatMessageDTO[]> {
    return this.http
      .get<ChatMessageDTO[]>(`${this.baseUrl}/messages/${senderId}/${recipientId}`)
      .pipe(map((msgs) => msgs ?? []));
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
