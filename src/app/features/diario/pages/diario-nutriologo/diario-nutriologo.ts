import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { DiarioComidaService } from '../../service/diario-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import {
  DiarioComidaResponse,
  HORARIOS_LABEL,
  ESTADOS_LABEL,
} from '../../interfaces/diario.interface';

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Component({
  selector: 'app-diario-nutriologo',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './diario-nutriologo.html',
  styleUrl: './diario-nutriologo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioNutriologo {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly diarioService = inject(DiarioComidaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly horariosLabel = HORARIOS_LABEL;
  protected readonly estadosLabel = ESTADOS_LABEL;

  // ─── Route param ──────────────────────────────────────────────────────
  private readonly rawId = this.route.snapshot.paramMap.get('pacienteId');
  protected readonly pacienteId = signal<number | null>(
    this.rawId ? Number(this.rawId) : null
  );

  // ─── Search form (shown when no pacienteId) ───────────────────────────
  protected readonly searchForm = this.fb.nonNullable.group({
    pacienteId: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
  });

  protected onSearch(): void {
    if (this.searchForm.invalid) return;
    const id = Number(this.searchForm.getRawValue().pacienteId);
    this.router.navigate(['/main/diario/paciente', id]);
  }

  // ─── Patient data ─────────────────────────────────────────────────────
  protected readonly pacienteResource = rxResource({
    params: () => this.pacienteId(),
    stream: ({ params }) =>
      params !== null ? this.pacienteService.obtenerPacientePorId(params) : of(null),
  });

  protected readonly pacienteNombre = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return `Paciente #${this.pacienteId()}`;
    return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
  });

  // ─── Historial data ───────────────────────────────────────────────────
  protected readonly historialResource = rxResource({
    params: () => this.pacienteId(),
    stream: ({ params }) =>
      params !== null
        ? this.diarioService.obtenerHistorialPorPaciente(params)
        : of([] as DiarioComidaResponse[]),
  });

  // ─── Date navigation ──────────────────────────────────────────────────
  protected readonly selectedDate = signal<Date>(new Date());

  protected readonly selectedDateStr = computed(() => toDateStr(this.selectedDate()));

  protected readonly selectedDateDisplay = computed(() => {
    const d = this.selectedDate();
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  protected readonly filteredEntries = computed(() => {
    const entries = this.historialResource.value() ?? [];
    return entries.filter(e => e.fecha === this.selectedDateStr());
  });

  protected changeDate(delta: number): void {
    this.selectedDate.update(d => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  protected jumpToDate(value: string): void {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    this.selectedDate.set(new Date(y, m - 1, d));
  }

  // ─── Observation modal ────────────────────────────────────────────────
  protected readonly isObsModalOpen = signal(false);
  protected readonly obsEntry = signal<DiarioComidaResponse | null>(null);
  protected readonly isSubmittingObs = signal(false);

  protected readonly obsForm = this.fb.nonNullable.group({
    observacion: ['', [Validators.required, Validators.maxLength(500)]],
  });

  protected openObsModal(entry: DiarioComidaResponse): void {
    this.obsEntry.set(entry);
    this.obsForm.reset({ observacion: entry.observacionNutriologo ?? '' });
    this.isObsModalOpen.set(true);
  }

  protected closeObsModal(): void {
    this.isObsModalOpen.set(false);
    this.obsEntry.set(null);
  }

  protected onSubmitObs(): void {
    if (this.obsForm.invalid || this.isSubmittingObs()) return;
    const entry = this.obsEntry();
    if (entry === null) return;

    const { observacion } = this.obsForm.getRawValue();
    this.isSubmittingObs.set(true);

    this.diarioService
      .agregarObservacion(entry.id, { observacion })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Observación guardada exitosamente.');
          this.historialResource.reload();
          this.closeObsModal();
          this.isSubmittingObs.set(false);
        },
        error: () => {
          this.isSubmittingObs.set(false);
        },
      });
  }

  protected toLower(s: string): string {
    return s.toLowerCase();
  }

  protected formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected get isFutureDate(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.selectedDate() > today;
  }
}
