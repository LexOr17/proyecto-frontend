import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SugerenciaService } from '../../service/sugerencia-service';
import { ESTADOS_SUGERENCIA, Sugerencia } from '../../interfaces/sugerencia.interface';
import { TIPOS_COMIDA } from '../../../plantillas/interfaces/plantilla.interface';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

@Component({
  selector: 'app-mis-sugerencias',
  imports: [RouterLink, Pagination, DecimalPipe, SlicePipe],
  templateUrl: './mis-sugerencias.html',
  styleUrl: './mis-sugerencias.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisSugerencias {
  private readonly sugerenciaService = inject(SugerenciaService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tiposComida = TIPOS_COMIDA;
  protected readonly estadosSugerencia = ESTADOS_SUGERENCIA;

  protected isCancelling = signal<number | null>(null);
  protected currentPage = signal(0);
  protected pageSize = signal(10);

  protected sugerenciasResource = rxResource({
    params: () => ({ page: this.currentPage(), size: this.pageSize() }),
    stream: ({ params }) =>
      this.sugerenciaService.obtenerMisSugerencias(params.page, params.size),
  });

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
  }

  protected obtenerIconTipo(tipo: string): string {
    return this.tiposComida.find((t) => t.value === tipo)?.icon ?? '';
  }

  protected obtenerLabelTipo(tipo: string): string {
    return this.tiposComida.find((t) => t.value === tipo)?.label ?? tipo;
  }

  protected obtenerEstado(estado: string) {
    return this.estadosSugerencia.find((e) => e.value === estado);
  }

  protected async cancelarSugerencia(sugerencia: Sugerencia): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Cancelar sugerencia',
      `¿Estás seguro de cancelar la sugerencia "${sugerencia.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    this.isCancelling.set(sugerencia.id);
    this.sugerenciaService
      .cancelarSugerencia(sugerencia.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Sugerencia cancelada correctamente');
          this.sugerenciasResource.reload();
          this.isCancelling.set(null);
        },
        error: () => {
          this.isCancelling.set(null);
        },
      });
  }
}
