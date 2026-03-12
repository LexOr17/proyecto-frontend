import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaService } from '../../service/cita-service';
import { AuthService } from '../../../../core/services/auth-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { MotivoCita } from '../../interfaces/cita.interface';

@Component({
  selector: 'app-solicitar-cita-paciente',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './solicitar-cita-paciente.html',
  styleUrl: './solicitar-cita-paciente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitarCitaPaciente {
  private readonly fb = inject(FormBuilder);
  private readonly citaService = inject(CitaService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  protected readonly isSubmitting = signal(false);

  protected readonly motivoCitaOptions: { value: MotivoCita; label: string }[] = [
    { value: 'PRIMERA_VEZ', label: 'Primera vez' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
    { value: 'REVISION_DE_PLAN', label: 'Revisión de plan' },
    { value: 'NUEVO_SINTOMA', label: 'Nuevo síntoma' },
    { value: 'CONTROL_MENSUAL', label: 'Control mensual' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    fechaHoraInicio: ['', Validators.required],
    motivo: ['PRIMERA_VEZ' as MotivoCita, Validators.required],
  });

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const pacienteId = this.authService.userId();
    if (!pacienteId) {
      this.notificationService.error('No se pudo identificar al paciente. Por favor vuelve a iniciar sesión.');
      return;
    }

    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();

    this.citaService
      .solicitarCita(pacienteId, {
        fechaHoraInicio: new Date(raw.fechaHoraInicio).toISOString(),
        motivoCita: raw.motivo,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Cita solicitada correctamente. El nutriólogo la confirmará pronto.');
          this.router.navigate(['/main/mis-citas'])
            .then(() => this.isSubmitting.set(false))
            .catch(() => this.isSubmitting.set(false));
        },
        error: () => this.isSubmitting.set(false),
      });
  }
}
