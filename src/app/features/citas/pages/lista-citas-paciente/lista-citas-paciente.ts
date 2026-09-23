import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CitaService } from '../../service/cita-service';
import { AuthService } from '../../../../core/services/auth-service';
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
    { value: 'CANCELACION_SOLICITADA', label: 'Cancelación solicitada' },
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
      CANCELACION_SOLICITADA: 'Cancelación solicitada',
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
      CANCELACION_SOLICITADA: 'badge-cancelacion-solicitada',
      REPROGRAMACION_SOLICITADA: 'badge-reprogramacion',
      ASISTIO: 'badge-asistio',
      NO_ASISTIO: 'badge-no-asistio',
    };
    return map[estado] ?? '';
  }

  protected puedeSolicitarCancelacion(cita: CitaResponse): boolean {
    return cita.estado === 'PROGRAMADA' || cita.estado === 'SOLICITADA';
  }

  protected puedeReprogramar(cita: CitaResponse): boolean {
    return cita.estado === 'PROGRAMADA';
  }
}
