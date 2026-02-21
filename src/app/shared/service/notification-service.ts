import { Injectable, signal } from '@angular/core';
import { Notification, NotificationType } from '../interfaces/notification.interface';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  private readonly _notifications = signal<Notification[]>([]);
  
  // Exposición de notificaciones como readonly
  readonly notifications = this._notifications.asReadonly();

  private show(message: string, type: NotificationType, duration: number = 5000): void {
    const id = this.generateId();
    const notification: Notification = { id, message, type, duration };

    // Agregar notificación
    this._notifications.update(current => [...current, notification]);

    // Auto-eliminar después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  remove(id: string): void {
    this._notifications.update(current => 
      current.filter(notification => notification.id !== id)
    );
  }

  clear(): void {
    this._notifications.set([]);
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
