import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CitaService } from '../../service/cita-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { CitaResponse } from '../../interfaces/cita.interface';

type PanelActivo = 'ninguno' | 'finalizar' | 'reprogramar';

@Component({
  selector: 'app-detalle-cita-nutriologo',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './detalle-cita-nutriologo.html',
  styleUrl: './detalle-cita-nutriologo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalleCitaNutriologo {
  private readonly route = inject(ActivatedRoute);
  private readonly citaService = inject(CitaService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  private readonly citaId = signal(Number(this.route.snapshot.paramMap.get('id')));

  protected readonly citaResource = rxResource({
    params: () => ({ id: this.citaId() }),
    stream: ({ params }) => this.citaService.obtenerCitaPorId(params.id),
  });

  protected readonly panelActivo = signal<PanelActivo>('ninguno');
  protected readonly isSubmitting = signal(false);

  // ── Formulario: Finalizar ────────────────────────────────────────────────
  protected readonly finalizarForm = this.fb.nonNullable.group({
    asistio: [true as boolean, Validators.required],
    observaciones: [''],
  });

  protected readonly mostrarObservaciones = computed(
    () => this.finalizarForm.get('asistio')?.value === true
  );

  // ── Helpers ──────────────────────────────────────────────────────────────

  protected formatearFecha(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  protected formatearHora(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  protected etiquetaMotivo(motivo: string): string {
    const map: Record<string, string> = {
      PRIMERA_VEZ: 'Primera vez',
      SEGUIMIENTO: 'Seguimiento',
      REVISION_DE_PLAN: 'Revisión de plan',
      NUEVO_SINTOMA: 'Nuevo síntoma',
      CONTROL_MENSUAL: 'Control mensual',
      OTRO: 'Otro',
    };
    return map[motivo] ?? motivo;
  }

  protected etiquetaEstado(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'Programada',
      SOLICITADA: 'Solicitada',
      CANCELADA: 'Cancelada',
      CANCELACION_SOLICITADA: 'Cancelación solicitada',
      REPROGRAMACION_SOLICITADA: 'Reprogramación solicitada',
      ASISTIO: 'Asistió',
      NO_ASISTIO: 'No asistió',
    };
    return map[estado] ?? estado;
  }

  protected claseEstado(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'badge-programada',
      SOLICITADA: 'badge-solicitada',
      CANCELADA: 'badge-cancelada',
      CANCELACION_SOLICITADA: 'badge-cancelacion-solicitada',
      REPROGRAMACION_SOLICITADA: 'badge-reprogramacion',
      ASISTIO: 'badge-asistio',
      NO_ASISTIO: 'badge-no-asistio',
    };
    return map[estado] ?? '';
  }

  protected abrirPanel(panel: PanelActivo): void {
    this.panelActivo.set(panel);
  }

  protected cerrarPanel(): void {
    this.panelActivo.set('ninguno');
    this.finalizarForm.reset({ asistio: true });
  }

  // ── Aceptar cita solicitada (SOLICITADA → PROGRAMADA) ───────────────────
  protected aceptarSolicitudCita(cita: CitaResponse): void {
    this.isSubmitting.set(true);
    this.citaService
      .aceptarCita(cita.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Cita aceptada y programada correctamente');
          this.citaResource.reload();
          this.isSubmitting.set(false);
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  // ── Confirmar reprogramación (nutriólogo acepta la solicitud del paciente) ──
  protected confirmarReprogramacion(): void {
    this.isSubmitting.set(true);
    this.citaService
      .aceptarCita(this.citaId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Reprogramación aceptada correctamente');
          this.cerrarPanel();
          this.citaResource.reload();
          this.isSubmitting.set(false);
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  // ── Finalizar cita ───────────────────────────────────────────────────────
  protected finalizarCita(): void {
    if (this.finalizarForm.invalid) {
      this.finalizarForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const raw = this.finalizarForm.getRawValue();

    this.citaService
      .finalizarCita(
        this.citaId(),
        raw.asistio,
        raw.asistio ? raw.observaciones || undefined : undefined,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Cita finalizada correctamente');
          this.cerrarPanel();
          this.citaResource.reload();
          this.isSubmitting.set(false);
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  // ── Aceptar cancelación solicitada por el paciente ─────────────────────
  protected async aceptarCancelacion(cita: CitaResponse): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Aceptar cancelación',
      `¿Confirmas la cancelación de esta cita? El paciente la ha solicitado.`
    );
    if (!confirmed) return;

    this.isSubmitting.set(true);
    this.citaService
      .cancelarCita(cita.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Cancelación aceptada');
          this.citaResource.reload();
          this.isSubmitting.set(false);
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  // ── Cancelar cita ────────────────────────────────────────────────────────
  protected async cancelarCita(cita: CitaResponse): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Cancelar cita',
      `¿Deseas cancelar esta cita? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    this.isSubmitting.set(true);
    this.citaService
      .cancelarCita(cita.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Cita cancelada');
          this.citaResource.reload();
          this.isSubmitting.set(false);
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  // ── Acciones disponibles por estado ────────────────────────────────────
  protected puedeAceptarCita(estado: string): boolean {
    return estado === 'SOLICITADA';
  }

  protected puedeFinalizarCita(estado: string): boolean {
    return estado === 'PROGRAMADA' || estado === 'REPROGRAMACION_SOLICITADA';
  }

  protected puedeCancelar(estado: string): boolean {
    return estado === 'PROGRAMADA' || estado === 'SOLICITADA' || estado === 'REPROGRAMACION_SOLICITADA';
  }

  protected puedeAceptarReprogramacion(estado: string): boolean {
    return estado === 'REPROGRAMACION_SOLICITADA';
  }

  protected puedeAceptarCancelacion(estado: string): boolean {
    return estado === 'CANCELACION_SOLICITADA';
  }
}
