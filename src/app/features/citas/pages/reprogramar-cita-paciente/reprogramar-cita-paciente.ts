import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaService } from '../../service/cita-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';

@Component({
  selector: 'app-reprogramar-cita-paciente',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reprogramar-cita-paciente.html',
  styleUrl: './reprogramar-cita-paciente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReprogramarCitaPaciente {
  private readonly fb = inject(FormBuilder);
  private readonly citaService = inject(CitaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  protected readonly isSubmitting = signal(false);

  private readonly citaId = signal(Number(this.route.snapshot.paramMap.get('id')));

  protected readonly form = this.fb.nonNullable.group({
    nuevaFechaHoraInicio: ['', [Validators.required, FormValidatorHelper.fechaHoraFuturaValidator()]],
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
    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();

    this.citaService
      .reprogramarCita(
        this.citaId(),
        raw.nuevaFechaHoraInicio.length === 16
          ? `${raw.nuevaFechaHoraInicio}:00`
          : raw.nuevaFechaHoraInicio,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Solicitud de reprogramación enviada correctamente');
          this.router.navigate(['/main/mis-citas'])
            .then(() => this.isSubmitting.set(false))
            .catch(() => this.isSubmitting.set(false));
        },
        error: () => this.isSubmitting.set(false),
      });
  }
}
