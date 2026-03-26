import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth-service';
import { MetaService } from '../../service/meta-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { EstadoMeta, MetaResponse } from '../../interfaces/meta.interface';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

@Component({
  selector: 'app-mis-metas',
  imports: [Pagination],
  templateUrl: './mis-metas.html',
  styleUrl: './mis-metas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisMetas {
  private readonly metaService = inject(MetaService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly pacienteId = this.authService.userId()!;

  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(4);
  protected readonly processingId = signal<number | null>(null);
  protected readonly reportingMetaId = signal<number | null>(null);
  protected readonly reportTexts = signal<Record<number, string>>({});

  protected readonly conteoResource = rxResource({
    params: () => this.pacienteId,
    stream: ({ params }) => this.metaService.obtenerConteoMetas(params),
  });

  protected readonly metasResource = rxResource({
    params: () => ({
      pacienteId: this.pacienteId,
      page: this.currentPage(),
      size: this.pageSize(),
    }),
    stream: ({ params }) =>
      this.metaService.listarMetasPorPaciente(params.pacienteId, params.page, params.size),
  });

  protected readonly metasActivas = computed(() =>
    (this.metasResource.value()?.content ?? []).filter(
      m => m.estado === 'PENDIENTE' || m.estado === 'RECHAZADA'
    )
  );

  protected readonly metasEnRevision = computed(() =>
    (this.metasResource.value()?.content ?? []).filter(m => m.estado === 'POR_VALIDAR')
  );

  protected readonly metasHistorial = computed(() =>
    (this.metasResource.value()?.content ?? []).filter(
      m => m.estado === 'CUMPLIDA' || m.estado === 'NO_CUMPLIDA'
    )
  );

  protected readonly userName = this.authService.userName;

  protected marcarCumplida(meta: MetaResponse): void {
    this.processingId.set(meta.id);
    this.metaService
      .actualizarEstado(meta.id, { nuevoEstado: 'POR_VALIDAR' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('¡Meta enviada a revisión! Tu nutriólogo la validará pronto.');
          this.processingId.set(null);
          this.metasResource.reload();
          this.conteoResource.reload();
        },
        error: () => this.processingId.set(null),
      });
  }

  protected toggleReporte(metaId: number): void {
    this.reportingMetaId.update(id => (id === metaId ? null : metaId));
  }

  protected setReportText(metaId: number, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.reportTexts.update(m => ({ ...m, [metaId]: value }));
  }

  protected enviarReporte(meta: MetaResponse): void {
    const texto = (this.reportTexts()[meta.id] ?? '').trim();
    if (!texto) {
      this.notificationService.warning('Por favor cuéntanos qué dificultad tuviste.');
      return;
    }
    this.processingId.set(meta.id);
    this.metaService
      .actualizarEstado(meta.id, { nuevoEstado: 'NO_CUMPLIDA', observaciones: texto })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.info('Reporte enviado. Tu nutriólogo revisará tu caso.');
          this.processingId.set(null);
          this.reportingMetaId.set(null);
          this.reportTexts.update(m => {
            const updated = { ...m };
            delete updated[meta.id];
            return updated;
          });
          this.metasResource.reload();
          this.conteoResource.reload();
        },
        error: () => this.processingId.set(null),
      });
  }

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
  }

  protected formatearFecha(fecha: string): string {
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected etiquetaEstado(estado: EstadoMeta): string {
    const labels: Record<EstadoMeta, string> = {
      PENDIENTE: 'En Curso',
      POR_VALIDAR: 'En Revisión',
      CUMPLIDA: '¡Lograda!',
      RECHAZADA: 'A reintentar',
      NO_CUMPLIDA: 'Requiere ajuste',
    };
    return labels[estado];
  }

  protected claseEstado(estado: EstadoMeta): string {
    const classes: Record<EstadoMeta, string> = {
      PENDIENTE: 'badge-pendiente',
      POR_VALIDAR: 'badge-por-validar',
      CUMPLIDA: 'badge-cumplida',
      RECHAZADA: 'badge-rechazada',
      NO_CUMPLIDA: 'badge-no-cumplida',
    };
    return classes[estado];
  }

  protected porcentajeProgreso(): number {
    return Math.min(100, this.conteoResource.value()?.porcentaje ?? 0);
  }
}
