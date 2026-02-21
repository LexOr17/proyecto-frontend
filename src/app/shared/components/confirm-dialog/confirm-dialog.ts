import { afterRenderEffect, ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { ConfirmDialogService } from '../../service/confirm-dialog-service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {

  private readonly dialogService = inject(ConfirmDialogService);
  private previouslyFocused: HTMLElement | null = null;

  protected isOpen = this.dialogService.isOpen;
  protected title = this.dialogService.title;
  protected message = this.dialogService.message;

  private dialogBox = viewChild<ElementRef<HTMLElement>>('dialogBox');

  constructor() {
    afterRenderEffect(() => {
      if (this.isOpen()) {
        this.previouslyFocused = document.activeElement as HTMLElement;
        // Dar foco al primer botón dentro del dialog
        const box = this.dialogBox()?.nativeElement;
        if (box) {
          const firstFocusable = box.querySelector<HTMLElement>('button, [tabindex]');
          firstFocusable?.focus();
        }
      } else if (this.previouslyFocused) {
        this.previouslyFocused.focus();
        this.previouslyFocused = null;
      }
    });
  }

  protected onConfirm(): void {
    this.dialogService.confirm();
  }

  protected onCancel(): void {
    this.dialogService.cancel();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.onCancel();
      return;
    }

    if (event.key !== 'Tab') return;

    const box = this.dialogBox()?.nativeElement;
    if (!box) return;

    const focusableElements = box.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}
