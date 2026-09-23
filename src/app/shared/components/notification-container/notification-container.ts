import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { NotificationService } from '../../service/notification-service';
import { NotificationItem } from '../notification-item/notification-item';

@Component({
  selector: 'app-notification-container',
  imports: [NotificationItem],
  templateUrl: './notification-container.html',
  styleUrl: './notification-container.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationContainer {
  
  private readonly notificationService = inject(NotificationService);
  
  protected notifications = this.notificationService.notifications;

  protected onCloseNotification(id: string): void {
    this.notificationService.remove(id);
  }
}
