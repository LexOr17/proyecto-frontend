import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { AuthService } from '../../../../core/services/auth-service';
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';
import { NotificationService } from '../../../../shared/service/notification-service';

@Component({
  selector: 'app-login-page',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected isLoading = signal(false);

  // Formulario Reactivo Estricto
  protected loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [
      Validators.required, 
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    ]]
  });

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login({ correo: email, password: password })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Inicio de sesión exitoso');
          this.router.navigate(['/main/dashboard'])
            .then(success => {
              if (!success) this.isLoading.set(false);
            })
            .catch(() => this.isLoading.set(false));
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
  }

  // 1. Verifica si hay error visual (borde rojo)
  protected isInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return FormValidatorHelper.isFieldInvalid(control);
  }

  // 2. Obtiene el texto del error
  protected getErrorMessage(fieldName: string, label: string): string {
    const control = this.loginForm.get(fieldName);
    return FormValidatorHelper.getErrorMessage(control, label);
  }

}
