import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from "@angular/router";
import { AuthService } from '../../services/auth-service';
import { FormValidatorHelper } from '../../../shared/helpers/form-validator-helper';

@Component({
  selector: 'app-login-page',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  protected isLoading = signal(false);
  protected loginError = signal<string | null>(null);

  // Formulario Reactivo Estricto
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.loginError.set(null);

    const { email, password } = this.loginForm.getRawValue();

    this.authService.login({ correo: email, contrasena: password }).subscribe({
      next: () => {
        // Navegación exitosa (depende de tu estructura)
        console.log('Login exitoso');
        this.router.navigate(['/main/dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
        // Manejo básico de error (puedes refinar esto según lo que devuelva Spring Boot en error)
        this.loginError.set('Credenciales incorrectas o error en el servidor.');
      }
    });
  }

  // 1. Verifica si hay error visual (borde rojo)
  isInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return FormValidatorHelper.isFieldInvalid(control);
  }

  // 2. Obtiene el texto del error
  getErrorMessage(fieldName: string, label: string): string {
    const control = this.loginForm.get(fieldName);
    return FormValidatorHelper.getErrorMessage(control, label);
  }

}
