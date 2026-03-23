import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { DiarioComidaService } from '../../service/diario-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import {
  DiarioComidaResponse,
  HORARIOS_LABEL,
  ESTADOS_LABEL,
} from '../../interfaces/diario.interface';

@Component({
  selector: 'app-diario-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './diario-admin.html',
  styleUrl: './diario-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioAdmin {
  private readonly diarioService = inject(DiarioComidaService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly horariosLabel = HORARIOS_LABEL;
  protected readonly estadosLabel = ESTADOS_LABEL;

  // ─── State ────────────────────────────────────────────────────────────
  protected readonly searchedPacienteId = signal<number | null>(null);
  protected readonly filterTerm = signal('');
  protected readonly isDeletingId = signal<number | null>(null);

  // ─── Search form ──────────────────────────────────────────────────────
  protected readonly searchForm = this.fb.nonNullable.group({
    pacienteId: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
  });

  protected onSearch(): void {
    if (this.searchForm.invalid) return;
    const id = Number(this.searchForm.getRawValue().pacienteId);
    this.searchedPacienteId.set(id);
  }

  // ─── Data ─────────────────────────────────────────────────────────────
  protected readonly historialResource = rxResource({
    params: () => this.searchedPacienteId(),
    stream: ({ params }) =>
      params !== null
        ? this.diarioService.obtenerHistorialPorPaciente(params)
        : of([] as DiarioComidaResponse[]),
  });

  protected readonly filteredEntries = computed(() => {
    const entries = this.historialResource.value() ?? [];
    const term = this.filterTerm().toLowerCase().trim();
    if (!term) return entries;
    return entries.filter(e => {
      const fields = [
        String(e.id),
        e.fecha,
        this.horariosLabel[e.horario],
        this.estadosLabel[e.estado],
        e.nombreComidaSugerida ?? '',
        e.detallesComidaReal ?? '',
      ];
      return fields.some(f => f.toLowerCase().includes(term));
    });
  });

  protected onFilterChange(event: Event): void {
    this.filterTerm.set((event.target as HTMLInputElement).value);
  }

  // ─── Delete ───────────────────────────────────────────────────────────
  protected async eliminar(entry: DiarioComidaResponse): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar Registro',
      `¿Eliminar permanentemente el registro #${entry.id} (${this.horariosLabel[entry.horario]} del ${entry.fecha})?`
    );
    if (!confirmed) return;

    this.isDeletingId.set(entry.id);
    this.diarioService
      .eliminar(entry.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(
            `Registro #${entry.id} eliminado permanentemente.`
          );
          this.historialResource.reload();
          this.isDeletingId.set(null);
        },
        error: () => {
          this.isDeletingId.set(null);
        },
      });
  }

  protected toLower(s: string): string {
    return s.toLowerCase();
  }
}
