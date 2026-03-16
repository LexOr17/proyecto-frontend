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

@Component({
  selector: 'app-cancelar-cita-paciente',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cancelar-cita-paciente.html',
  styleUrl: './cancelar-cita-paciente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelarCitaPaciente {
  private readonly fb = inject(FormBuilder);
  private readonly citaService = inject(CitaService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  protected readonly isSubmitting = signal(false);

  private readonly citaId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly form = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(500)]],
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
    this.isSubmitting.set(true);
    const { motivo } = this.form.getRawValue();

    this.citaService
      .solicitarCancelacionCita(this.citaId, motivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Solicitud de cancelación enviada correctamente');
          this.router.navigate(['/main/mis-citas'])
            .then(() => this.isSubmitting.set(false))
            .catch(() => this.isSubmitting.set(false));
        },
        error: () => this.isSubmitting.set(false),
      });
  }
}
