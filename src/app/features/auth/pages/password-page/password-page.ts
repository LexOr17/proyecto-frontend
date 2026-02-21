import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  private readonly notificationService = inject(NotificationService);

  protected isLoading = signal(false);
  protected submitted = signal(false);

  protected recoveryForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected onSubmit(): void {
    if (this.recoveryForm.invalid) {
      this.recoveryForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    // TODO: Conectar con el endpoint de recuperación cuando esté disponible
    // Por ahora simulamos la respuesta exitosa
    setTimeout(() => {
      this.isLoading.set(false);
      this.submitted.set(true);
      this.notificationService.success('Si el correo existe, recibirás instrucciones para restablecer tu contraseña.');
    }, 1000);
  }

  protected isInvalid(fieldName: string): boolean {
    const control = this.recoveryForm.get(fieldName);
    return FormValidatorHelper.isFieldInvalid(control);
  }

  protected getErrorMessage(fieldName: string, label: string): string {
    const control = this.recoveryForm.get(fieldName);
    return FormValidatorHelper.getErrorMessage(control, label);
  }

}
