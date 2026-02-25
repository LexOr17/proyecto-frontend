import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AlimentoService } from '../../service/alimento-service';
import { Alimento, CATEGORIAS_ALIMENTO } from '../../interfaces/alimento.interface';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

@Component({
  selector: 'app-lista-alimentos',
  imports: [RouterLink, Pagination],
  templateUrl: './lista-alimentos.html',
  styleUrl: './lista-alimentos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaAlimentos {
  private readonly alimentoService = inject(AlimentoService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categorias = CATEGORIAS_ALIMENTO;

  protected searchTerm = signal('');
  protected isDeleting = signal<number | null>(null);

  // Paginación
  protected currentPage = signal(0);
  protected pageSize = signal(10);

  // rxResource: carga reactiva de alimentos
  protected alimentosResource = rxResource({
    params: () => ({ page: this.currentPage(), size: this.pageSize() }),
    stream: ({ params }) =>
      this.alimentoService.obtenerAlimentos(params.page, params.size),
  });

  // Filtro local sobre datos cargados
  protected alimentosFiltrados = computed(() => {
    const alimentos = this.alimentosResource.value()?.content ?? [];
    const term = this.searchTerm().toLowerCase();
    if (!term) return alimentos;
    return alimentos.filter(
      (a) =>
        a.nombre.toLowerCase().includes(term) ||
        a.categoria.toLowerCase().includes(term)
    );
  });

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
  }

  protected onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected obtenerLabelCategoria(valor: string): string {
    return this.categorias.find((c) => c.value === valor)?.label ?? valor;
  }

  protected obtenerClaseBadge(categoria: string): string {
    const cat = categoria.toUpperCase();
    if (cat === 'FRUTAS') return 'badge-frutas';
    if (cat === 'VERDURAS') return 'badge-verduras';
    if (cat === 'CARNES') return 'badge-carnes';
    if (cat === 'LACTEOS') return 'badge-lacteos';
    if (cat === 'CEREALES') return 'badge-cereales';
    return 'badge-default';
  }

  protected editarAlimento(alimento: Alimento): void {
    if (alimento.id) {
      this.router.navigate(['/main/alimentos/editar', alimento.id]);
    }
  }

  protected async eliminarAlimento(alimento: Alimento): Promise<void> {
    if (!alimento.id) return;

    const confirmed = await this.confirmDialog.open(
      'Eliminar alimento',
      `¿Estás seguro de eliminar "${alimento.nombre}"?`
    );

    if (confirmed) {
      this.isDeleting.set(alimento.id);

      this.alimentoService
        .eliminarAlimento(alimento.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notificationService.success('Alimento eliminado correctamente');
            this.alimentosResource.reload();
            this.isDeleting.set(null);
          },
          error: () => {
            this.isDeleting.set(null);
          },
        });
    }
  }
}
