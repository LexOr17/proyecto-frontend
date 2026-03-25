import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { DiarioExtendidoService } from '../../service/diario-extendido-service';
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

@Component({
  selector: 'app-diario-extendido-admin',
  imports: [ReactiveFormsModule, Pagination],
  templateUrl: './diario-extendido-admin.html',
  styleUrl: './diario-extendido-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioExtendidoAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DiarioExtendidoService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly ESTADO_ANIMO_MAP = ESTADO_ANIMO_MAP;
  protected readonly CALIDAD_SUENO_MAP = CALIDAD_SUENO_MAP;
  protected readonly SINTOMA_LABEL = SINTOMA_LABEL;
  protected readonly TIPO_ACTIVIDAD_LABEL = TIPO_ACTIVIDAD_LABEL;

  protected readonly searchedPacienteId = signal<number | null>(null);
  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly isDeleting = signal<number | null>(null);

  protected readonly searchForm = this.fb.group({
    pacienteId: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
    ]),
  });

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

  protected onSearch(): void {
    if (this.searchForm.invalid) return;
    const id = this.searchForm.controls.pacienteId.value;
    if (id) {
      this.currentPage.set(0);
      this.searchedPacienteId.set(id);
    }
  }

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
  }

  protected async eliminarDiario(diario: DiarioExtendidoResponse): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar registro',
      `¿Estás seguro de eliminar permanentemente el registro #${diario.id} del ${this.formatFecha(diario.fecha)}? Esta acción es irreversible.`,
    );
    if (!confirmed) return;

    this.isDeleting.set(diario.id);
    this.service
      .eliminarDiario(diario.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`Registro #${diario.id} eliminado correctamente.`);
          this.isDeleting.set(null);
          this.historyResource.reload();
        },
        error: () => {
          this.isDeleting.set(null);
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
