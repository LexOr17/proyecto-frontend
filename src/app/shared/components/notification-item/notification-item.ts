import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { Notification } from '../../interfaces/notification.interface';

@Component({
  selector: 'app-notification-item',
  templateUrl: './notification-item.html',
  styleUrl: './notification-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationItem {

  notification = input.required<Notification>();
  close = output<string>();

  protected icon = computed(() => {
    switch (this.notification().type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'info': return 'ℹ';
      default: return 'ℹ';
    }
  });

  protected onClose(): void {
    this.close.emit(this.notification().id);
  }
}
