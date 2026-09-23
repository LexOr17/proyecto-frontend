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
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';

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
    fechaHoraInicio: ['', [Validators.required, FormValidatorHelper.fechaHoraFuturaValidator()]],
    motivo: ['PRIMERA_VEZ' as MotivoCita, Validators.required],
    detalleAdicional: ['', Validators.maxLength(500)],
  });

  /** Valor mínimo para el input datetime-local (ahora mismo) */
  protected get minDatetime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  protected isInvalid(field: string): boolean {
    return FormValidatorHelper.isFieldInvalidTouchedOrDirty(this.form.get(field));
  }

  protected getErrorMessage(field: string, label: string): string {
    return FormValidatorHelper.getErrorMessage(this.form.get(field), label);
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
      .solicitarCita({
        fechaHoraInicio: raw.fechaHoraInicio.length === 16 ? `${raw.fechaHoraInicio}:00` : raw.fechaHoraInicio,
        motivoCita: raw.motivo,
        ...(raw.detalleAdicional ? { detalleAdicional: raw.detalleAdicional } : {}),
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
