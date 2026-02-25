import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth-service';
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';
import { NotificationService } from '../../../../shared/service/notification-service';

@Component({
  selector: 'app-password-page',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './password-page.html',
  styleUrl: './password-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordPage {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected isLoading = signal(false);
  protected submitted = signal(false);

  protected recoveryForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    confirmEmail: ['', [Validators.required, Validators.email]],
  }, { validators: [PasswordPage.emailsMatchValidator] });
  // Validador estático para comparar ambos correos
  private static emailsMatchValidator(group: any) {
    const email = group.get('email')?.value;
    const confirmEmail = group.get('confirmEmail')?.value;
    return email === confirmEmail ? null : { emailsMismatch: true };
  }

  protected onSubmit(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    this.authService.recoverPassword(this.recoveryForm.getRawValue().email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.submitted.set(true);
          this.notificationService.success(response.mensaje);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
  }


  protected isInvalid(fieldName: string): boolean {
    const control = this.recoveryForm.get(fieldName);
    if (!control) return false;
    if (fieldName === 'confirmEmail' && this.recoveryForm.hasError('emailsMismatch')) {
      return true;
    }
    return FormValidatorHelper.isFieldInvalid(control);
  }

  protected getErrorMessage(fieldName: string, label: string): string {
    const control = this.recoveryForm.get(fieldName);
    if (fieldName === 'confirmEmail' && this.recoveryForm.hasError('emailsMismatch')) {
      return 'Los correos no coinciden';
    }
    return FormValidatorHelper.getErrorMessage(control, label);
  }

}
