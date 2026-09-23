import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { DiarioExtendidoService } from '../../service/diario-extendido-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';
import {
  DiarioExtendidoResponse,
  ESTADO_ANIMO_MAP,
  CALIDAD_SUENO_MAP,
  SINTOMA_LABEL,
  TIPO_ACTIVIDAD_LABEL,
} from '../../interfaces/diario-extendido.interface';
import { Paciente } from '../../../pacientes/interfaces/paciente.interface';

@Component({
  selector: 'app-diario-extendido-admin',
  imports: [ReactiveFormsModule, Pagination],
  templateUrl: './diario-extendido-admin.html',
  styleUrl: './diario-extendido-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioExtendidoAdmin {
  private readonly service = inject(DiarioExtendidoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly ESTADO_ANIMO_MAP = ESTADO_ANIMO_MAP;
  protected readonly CALIDAD_SUENO_MAP = CALIDAD_SUENO_MAP;
  protected readonly SINTOMA_LABEL = SINTOMA_LABEL;
  protected readonly TIPO_ACTIVIDAD_LABEL = TIPO_ACTIVIDAD_LABEL;

  // ─── Patient Selection ────────────────────────────────────────────────
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
    this.currentPage.set(0);
  }

  protected cambiarPaciente(): void {
    this.selectedPaciente.set(null);
    this.selectedIds.set(new Set());
    this.currentPage.set(0);
  }

  protected readonly searchedPacienteId = computed(() => this.selectedPaciente()?.id ?? null);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(12);
  protected readonly isDeleting = signal<number | null>(null);
  protected readonly isDeletingBatch = signal(false);

  // ─── Selection for Batch Delete ───────────────────────────────────────
  protected readonly selectedIds = signal<Set<number>>(new Set());

  protected readonly historyResource = rxResource({
    params: () => ({
      pacienteId: this.searchedPacienteId(),
      page: this.currentPage(),
      size: this.pageSize(),
    }),
    stream: ({ params }) => {
      if (!params.pacienteId) return of(null);
      return this.service.listarHistorialPaciente(
        params.pacienteId,
        params.page,
        params.size,
      );
    },
  });

  protected readonly diarios = computed(
    () => this.historyResource.value()?.content ?? [],
  );

  protected readonly totalElements = computed(
    () => this.historyResource.value()?.totalElements ?? 0,
  );

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
    this.selectedIds.set(new Set());
  }

  // ─── Selection Controls ───────────────────────────────────────────────
  protected isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  protected toggleSelect(id: number, event?: Event): void {
    if (event) event.stopPropagation();
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
    const list = this.diarios();
    if (list.length === 0) return false;
    const selected = this.selectedIds();
    return list.every(d => selected.has(d.id));
  });

  protected toggleSelectAll(): void {
    const list = this.diarios();
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(list.map(d => d.id)));
    }
  }

  protected readonly selectedCount = computed(() => this.selectedIds().size);

  // ─── Delete Actions ───────────────────────────────────────────────────
  protected async eliminarDiario(diario: DiarioExtendidoResponse, event?: Event): Promise<void> {
    if (event) event.stopPropagation();

    const confirmed = await this.confirmDialog.open(
      'Eliminar Registro de Bienestar',
      `¿Estás seguro de eliminar permanentemente el registro #${diario.id} del ${this.formatFecha(diario.fecha)}? Esta acción es irreversible.`
    );
    if (!confirmed) return;

    this.isDeleting.set(diario.id);
    this.service
      .eliminarDiario(diario.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`Registro #${diario.id} eliminado correctamente.`);
          this.selectedIds.update(set => {
            const next = new Set(set);
            next.delete(diario.id);
            return next;
          });
          this.isDeleting.set(null);
          this.historyResource.reload();
        },
        error: () => {
          this.isDeleting.set(null);
        },
      });
  }

  protected async eliminarSeleccionados(): Promise<void> {
    const count = this.selectedCount();
    if (count === 0 || this.isDeletingBatch()) return;

    const confirmed = await this.confirmDialog.open(
      'Eliminar Registros Seleccionados',
      `¿Estás seguro de eliminar permanentemente los ${count} registros de bienestar seleccionados del paciente? Esta acción es irreversible.`
    );
    if (!confirmed) return;

    const ids = Array.from(this.selectedIds());
    this.isDeletingBatch.set(true);

    const deleteObservables = ids.map(id => this.service.eliminarDiario(id));

    forkJoin(deleteObservables)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(
            `¡${count} reportes de bienestar fueron eliminados permanentemente!`
          );
          this.selectedIds.set(new Set());
          this.historyResource.reload();
          this.isDeletingBatch.set(false);
        },
        error: () => {
          this.notificationService.error('Ocurrió un error al eliminar algunos registros.');
          this.historyResource.reload();
          this.isDeletingBatch.set(false);
        },
      });
  }

  protected formatFecha(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date
      .toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
      .toUpperCase();
  }
}
