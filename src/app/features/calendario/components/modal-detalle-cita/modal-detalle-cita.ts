import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaService } from '../../../citas/service/cita-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import {
  CitaCalendario,
  ESTADO_CITA_COLOR,
  ESTADO_CITA_LABEL,
  MOTIVO_CITA_LABEL,
} from '../../interfaces/calendario.interface';

@Component({
  selector: 'app-modal-detalle-cita',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-detalle-cita.html',
  styleUrl: './modal-detalle-cita.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalDetalleCita {
  private readonly citaService = inject(CitaService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) cita!: CitaCalendario;
  @Input() isNutriologo: boolean = true;
  @Output() close = new EventEmitter<void>();
  @Output() citaActualizada = new EventEmitter<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly showObservacionesInput = signal(false);
  protected readonly showCancelacionPaciente = signal(false);
  protected readonly observaciones = signal('');
  protected readonly motivoCancelacion = signal('');

  protected readonly estadoLabel = ESTADO_CITA_LABEL;
  protected readonly estadoColor = ESTADO_CITA_COLOR;
  protected readonly motivoLabel = MOTIVO_CITA_LABEL;

  protected formatHora(iso: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  protected formatFecha(iso: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected toggleObservaciones(): void {
    this.showObservacionesInput.update(v => !v);
  }

  protected marcarAsistio(): void {
    this.isSubmitting.set(true);
    this.citaService
      .finalizarCita(this.cita.id, true, this.observaciones() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.success('Cita marcada como Asistida exitosamente.');
          this.citaActualizada.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.notificationService.error(err.error?.mensaje ?? 'Error al actualizar la cita.');
        },
      });
  }

  protected marcarNoAsistio(): void {
    this.isSubmitting.set(true);
    this.citaService
      .finalizarCita(this.cita.id, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.warning('Cita marcada como No Asistió.');
          this.citaActualizada.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.notificationService.error(err.error?.mensaje ?? 'Error al actualizar la cita.');
        },
      });
  }

  protected cancelarCita(): void {
    if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;

    this.isSubmitting.set(true);
    this.citaService
      .cancelarCita(this.cita.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.info('Cita cancelada.');
          this.citaActualizada.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.notificationService.error(err.error?.mensaje ?? 'Error al cancelar la cita.');
        },
      });
  }

  protected solicitarCancelacionPaciente(): void {
    const motivo = this.motivoCancelacion().trim();
    if (!motivo) {
      this.notificationService.warning('Por favor, ingresa el motivo de cancelación.');
      return;
    }

    this.isSubmitting.set(true);
    this.citaService
      .solicitarCancelacionCita(this.cita.id, motivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.info('Solicitud de cancelación enviada al nutriólogo.');
          this.citaActualizada.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.notificationService.error(err.error?.mensaje ?? 'Error al solicitar la cancelación.');
        },
      });
  }

  protected verExpedientePaciente(): void {
    if (this.cita.pacienteId) {
      this.close.emit();
      this.router.navigate(['/main/pacientes', this.cita.pacienteId]);
    }
  }

  protected cerrar(): void {
    this.close.emit();
  }
}
