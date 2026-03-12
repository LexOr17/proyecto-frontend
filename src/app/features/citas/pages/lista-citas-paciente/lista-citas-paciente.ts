import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CitaService } from '../../service/cita-service';
import { AuthService } from '../../../../core/services/auth-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { CitaResponse, EstadoCita } from '../../interfaces/cita.interface';

@Component({
  selector: 'app-lista-citas-paciente',
  imports: [RouterLink],
  templateUrl: './lista-citas-paciente.html',
  styleUrl: './lista-citas-paciente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaCitasPaciente {
  private readonly citaService = inject(CitaService);
  private readonly authService = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filtroEstado = signal<EstadoCita | 'TODAS'>('TODAS');
  protected readonly isProcessing = signal<number | null>(null);

  private readonly pacienteId = this.authService.userId;

  protected readonly citasResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) =>
      params.id
        ? this.citaService.obtenerCitasPorPaciente(params.id)
        : this.citaService.obtenerTodasLasCitas(),
  });

  protected readonly citasFiltradas = computed(() => {
    const citas = this.citasResource.value() ?? [];
    const estado = this.filtroEstado();
    if (estado === 'TODAS') return citas;
    return citas.filter((c) => c.estado === estado);
  });

  protected readonly estadoOptions: { value: EstadoCita | 'TODAS'; label: string }[] = [
    { value: 'TODAS', label: 'Todas' },
    { value: 'SOLICITADA', label: 'Solicitadas' },
    { value: 'PROGRAMADA', label: 'Programadas' },
    { value: 'REPROGRAMACION_SOLICITADA', label: 'Reprogramación' },
    { value: 'ASISTIO', label: 'Asistí' },
    { value: 'NO_ASISTIO', label: 'No asistí' },
    { value: 'CANCELADA', label: 'Canceladas' },
  ];

  protected setFiltro(estado: EstadoCita | 'TODAS'): void {
    this.filtroEstado.set(estado);
  }

  protected formatearFecha(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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

  protected etiquetaEstado(estado: EstadoCita): string {
    const map: Record<EstadoCita, string> = {
      PROGRAMADA: 'Programada',
      SOLICITADA: 'Solicitada',
      CANCELADA: 'Cancelada',
      REPROGRAMACION_SOLICITADA: 'Reprogramación solicitada',
      ASISTIO: 'Asistió',
      NO_ASISTIO: 'No asistió',
    };
    return map[estado] ?? estado;
  }

  protected claseEstado(estado: EstadoCita): string {
    const map: Record<EstadoCita, string> = {
      PROGRAMADA: 'badge-programada',
      SOLICITADA: 'badge-solicitada',
      CANCELADA: 'badge-cancelada',
      REPROGRAMACION_SOLICITADA: 'badge-reprogramacion',
      ASISTIO: 'badge-asistio',
      NO_ASISTIO: 'badge-no-asistio',
    };
    return map[estado] ?? '';
  }

  protected puedeCancelar(cita: CitaResponse): boolean {
    return cita.estado === 'PROGRAMADA' || cita.estado === 'SOLICITADA';
  }

  protected puedeReprogramar(cita: CitaResponse): boolean {
    return cita.estado === 'PROGRAMADA';
  }

  protected async cancelarCita(cita: CitaResponse): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Cancelar cita',
      `¿Deseas cancelar esta cita programada para el ${this.formatearFecha(cita.fechaHoraInicio)}?`
    );
    if (!confirmed) return;

    this.isProcessing.set(cita.id);
    this.citaService
      .cancelarCita(cita.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Cita cancelada correctamente');
          this.citasResource.reload();
          this.isProcessing.set(null);
        },
        error: () => this.isProcessing.set(null),
      });
  }
}
