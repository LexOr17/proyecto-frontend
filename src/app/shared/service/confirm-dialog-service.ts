import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {

  readonly isOpen = signal(false);
  readonly title = signal('');
  readonly message = signal('');

  private resolveRef: ((value: boolean) => void) | null = null;

  open(title: string, message: string): Promise<boolean> {
    this.title.set(title);
    this.message.set(message);
    this.isOpen.set(true);

    return new Promise<boolean>(resolve => {
      this.resolveRef = resolve;
    });
  }

  confirm(): void {
    this.isOpen.set(false);
    this.resolveRef?.(true);
    this.resolveRef = null;
  }

  cancel(): void {
    this.isOpen.set(false);
    this.resolveRef?.(false);
    this.resolveRef = null;
  }
}
