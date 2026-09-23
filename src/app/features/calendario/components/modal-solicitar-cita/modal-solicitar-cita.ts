import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaService } from '../../../citas/service/cita-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { MotivoCita } from '../../../citas/interfaces/cita.interface';

@Component({
  selector: 'app-modal-solicitar-cita',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './modal-solicitar-cita.html',
  styleUrl: './modal-solicitar-cita.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalSolicitarCita implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly citaService = inject(CitaService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) fecha!: string; // YYYY-MM-DD
  @Output() close = new EventEmitter<void>();
  @Output() solicitudEnviada = new EventEmitter<void>();

  protected readonly isSubmitting = signal(false);

  protected readonly motivosCita: { value: MotivoCita; label: string }[] = [
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
    { value: 'REVISION_DE_PLAN', label: 'Revisión de Plan' },
    { value: 'NUEVO_SINTOMA', label: 'Nuevo Síntoma' },
    { value: 'CONTROL_MENSUAL', label: 'Control Mensual' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    hora: ['10:00', Validators.required],
    motivoCita: ['SEGUIMIENTO' as MotivoCita, Validators.required],
    detalleAdicional: [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fecha']) {
      this.form.patchValue({ hora: '10:00', motivoCita: 'SEGUIMIENTO', detalleAdicional: '' });
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();

    const request = {
      fechaHoraInicio: `${this.fecha}T${raw.hora}:00`,
      motivoCita: raw.motivoCita,
      detalleAdicional: raw.detalleAdicional?.trim() || undefined,
    };

    this.citaService
      .solicitarCita(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.success('¡Solicitud de cita enviada a tu nutriólogo!');
          this.solicitudEnviada.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.notificationService.error(err.error?.mensaje ?? 'Error al enviar la solicitud.');
        },
      });
  }

  protected cerrar(): void {
    this.close.emit();
  }
}
