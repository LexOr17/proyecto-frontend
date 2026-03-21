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
import { PlantillaService } from '../../service/plantilla-service';
import { Plantilla, TIPOS_COMIDA } from '../../interfaces/plantilla.interface';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

@Component({
  selector: 'app-lista-plantillas',
  imports: [RouterLink, Pagination, SlicePipe, DecimalPipe],
  templateUrl: './lista-plantillas.html',
  styleUrl: './lista-plantillas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaPlantillas {
  private readonly plantillaService = inject(PlantillaService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tiposComida = TIPOS_COMIDA;
  protected isDeleting = signal<number | null>(null);
  protected currentPage = signal(0);
  protected pageSize = signal(6);

  protected plantillasResource = rxResource({
    params: () => ({ page: this.currentPage(), size: this.pageSize() }),
    stream: ({ params }) =>
      this.plantillaService.obtenerPlantillas(params.page, params.size),
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

  protected async eliminarPlantilla(plantilla: Plantilla): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar plantilla',
      `¿Estás seguro de eliminar "${plantilla.nombre}"?`
    );
    if (!confirmed) return;

    this.isDeleting.set(plantilla.id);
    this.plantillaService
      .eliminarPlantilla(plantilla.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Plantilla eliminada correctamente');
          this.plantillasResource.reload();
          this.isDeleting.set(null);
        },
        error: () => {
          this.isDeleting.set(null);
        },
      });
  }
}
