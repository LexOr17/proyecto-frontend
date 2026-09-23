import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { DiarioComidaService } from '../../service/diario-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import {
  DiarioComidaResponse,
  HORARIOS_LABEL,
  ESTADOS_LABEL,
} from '../../interfaces/diario.interface';
import { Paciente } from '../../../pacientes/interfaces/paciente.interface';

@Component({
  selector: 'app-diario-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './diario-admin.html',
  styleUrl: './diario-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioAdmin {
  private readonly diarioService = inject(DiarioComidaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly horariosLabel = HORARIOS_LABEL;
  protected readonly estadosLabel = ESTADOS_LABEL;

  // ─── Patient Selection (No Manual ID Required) ────────────────────────
  protected readonly searchTerm = signal<string>('');
  protected readonly selectedPaciente = signal<Paciente | null>(null);

  protected readonly pacientesListResource = rxResource({
    stream: () => this.pacienteService.obtenerPacientes(0, 100),
  });

  protected readonly allPacientes = computed((): Paciente[] => {
    return this.pacientesListResource.value()?.content ?? [];
  });

  protected readonly filteredPacientes = computed((): Paciente[] => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.allPacientes();
    if (!term) return list;
    return list.filter(p => {
      const full = `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno ?? ''}`.toLowerCase();
      return full.includes(term) || (p.id && String(p.id).includes(term)) || (p.correo && p.correo.toLowerCase().includes(term));
    });
  });

  protected selectPaciente(p: Paciente): void {
    this.selectedPaciente.set(p);
    this.selectedIds.set(new Set());
    this.filterTerm.set('');
  }

  protected cambiarPaciente(): void {
    this.selectedPaciente.set(null);
    this.selectedIds.set(new Set());
    this.filterTerm.set('');
  }

  protected readonly searchedPacienteId = computed(() => this.selectedPaciente()?.id ?? null);

  // ─── Historial Data ───────────────────────────────────────────────────
  protected readonly filterTerm = signal('');
  protected readonly isDeletingId = signal<number | null>(null);
  protected readonly isDeletingBatch = signal(false);

  // ─── Selection for Batch Delete ───────────────────────────────────────
  protected readonly selectedIds = signal<Set<number>>(new Set());

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
        this.horariosLabel[e.horario] ?? '',
        this.estadosLabel[e.estado] ?? '',
        e.nombreComidaSugerida ?? '',
        e.detallesComidaReal ?? '',
        e.observacionNutriologo ?? '',
      ];
      return fields.some(f => f.toLowerCase().includes(term));
    });
  });

  protected onFilterChange(event: Event): void {
    this.filterTerm.set((event.target as HTMLInputElement).value);
  }

  // ─── Checkbox Selection ───────────────────────────────────────────────
  protected isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  protected toggleSelect(id: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected readonly isAllSelected = computed(() => {
    const entries = this.filteredEntries();
    if (entries.length === 0) return false;
    const selected = this.selectedIds();
    return entries.every(e => selected.has(e.id));
  });

  protected toggleSelectAll(): void {
    const entries = this.filteredEntries();
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(entries.map(e => e.id)));
    }
  }

  protected readonly selectedCount = computed(() => this.selectedIds().size);

  // ─── Delete Actions ───────────────────────────────────────────────────
  protected async eliminar(entry: DiarioComidaResponse, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const confirmed = await this.confirmDialog.open(
      'Eliminar Registro',
      `¿Eliminar permanentemente el registro #${entry.id} (${this.horariosLabel[entry.horario]} del ${entry.fecha})? Esta acción no se puede deshacer.`
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
          this.selectedIds.update(set => {
            const next = new Set(set);
            next.delete(entry.id);
            return next;
          });
          this.historialResource.reload();
          this.isDeletingId.set(null);
        },
        error: () => {
          this.isDeletingId.set(null);
        },
      });
  }

  protected async eliminarSeleccionados(): Promise<void> {
    const count = this.selectedCount();
    if (count === 0 || this.isDeletingBatch()) return;

    const confirmed = await this.confirmDialog.open(
      'Eliminar Registros Seleccionados',
      `¿Estás seguro de eliminar permanentemente los ${count} registros seleccionados del paciente? Esta acción es irreversible.`
    );
    if (!confirmed) return;

    const ids = Array.from(this.selectedIds());
    this.isDeletingBatch.set(true);

    const deleteObservables = ids.map(id => this.diarioService.eliminar(id));

    forkJoin(deleteObservables)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(
            `¡${count} registros fueron eliminados permanentemente!`
          );
          this.selectedIds.set(new Set());
          this.historialResource.reload();
          this.isDeletingBatch.set(false);
        },
        error: () => {
          this.notificationService.error('Ocurrió un error al eliminar algunos registros.');
          this.historialResource.reload();
          this.isDeletingBatch.set(false);
        },
      });
  }

  protected toLower(s: string): string {
    return s.toLowerCase();
  }
}
