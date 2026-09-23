import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {

  private _isOpen = signal(false);
  private _title = signal('');
  private _message = signal('');

  readonly isOpen = this._isOpen.asReadonly();
  readonly title = this._title.asReadonly();
  readonly message = this._message.asReadonly();

  private resolveRef: ((value: boolean) => void) | null = null;

  open(title: string, message: string): Promise<boolean> {
    this._title.set(title);
    this._message.set(message);
    this._isOpen.set(true);

    return new Promise<boolean>(resolve => {
      this.resolveRef = resolve;
    });
  }

  confirm(): void {
    this._isOpen.set(false);
    this.resolveRef?.(true);
    this.resolveRef = null;
  }

  cancel(): void {
    this._isOpen.set(false);
    this.resolveRef?.(false);
    this.resolveRef = null;
  }
}
