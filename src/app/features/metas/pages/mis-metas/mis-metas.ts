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

  protected readonly pacienteId = this.authService.userId()!;

  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(6);
  protected readonly processingId = signal<number | null>(null);
  protected readonly reportingMetaId = signal<number | null>(null);
  protected readonly reportTexts = signal<Record<number, string>>({});
  protected readonly activeTab = signal<'ACTIVAS' | 'REVISION' | 'LOGRADAS' | 'NO_LOGRADAS'>('ACTIVAS');

  // Sugerencias de dificultad rápida para el reporte del paciente
  protected readonly dificultadesSugeridas = [
    'Falta de tiempo en el día',
    'Dificultad preparando las comidas',
    'Salidas / Eventos sociales',
    'Malestar o indisposición de salud',
    'Dudas con las porciones prescritas',
  ];

  // SVG Gauge para el Hero
  protected readonly radioGauge = 44;
  protected readonly circunferenciaGauge = 2 * Math.PI * 44;

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

  protected readonly metasLogradas = computed(() =>
    (this.metasResource.value()?.content ?? []).filter(m => m.estado === 'CUMPLIDA')
  );

  protected readonly metasNoLogradas = computed(() =>
    (this.metasResource.value()?.content ?? []).filter(m => m.estado === 'NO_CUMPLIDA')
  );

  protected readonly metasHistorial = computed(() =>
    (this.metasResource.value()?.content ?? []).filter(
      m => m.estado === 'CUMPLIDA' || m.estado === 'NO_CUMPLIDA'
    )
  );

  protected readonly userName = this.authService.userName;

  protected readonly porcentajeProgreso = computed(() => {
    const c = this.conteoResource.value();
    if (!c) return 0;
    const pct = c.porcentaje ?? c.porcentajeExito ?? (c.total > 0 ? (c.cumplidas / c.total) * 100 : 0);
    return Math.min(100, Math.max(0, Math.round(pct)));
  });

  // Mensaje motivacional dinámico según el porcentaje
  protected readonly mensajeMotivacional = computed(() => {
    const pct = this.porcentajeProgreso();
    if (pct === 100) {
      return {
        titulo: '¡Extraordinario logro!',
        texto: 'Has cumplido el 100% de tus objetivos. Tu constancia y disciplina son admirables.',
        badge: '¡Nivel Campeón! 🏆',
        clase: 'status-master',
      };
    } else if (pct >= 75) {
      return {
        titulo: '¡A pasos de la cima!',
        texto: 'Estás muy cerca de completar todos tus objetivos del período. ¡Mantén este gran ritmo!',
        badge: 'Gran Avance ⭐',
        clase: 'status-high',
      };
    } else if (pct >= 50) {
      return {
        titulo: '¡Más de la mitad logrado!',
        texto: 'Tu esfuerzo diario está rindiendo frutos. ¡Sigue enfocado en tus metas de salud!',
        badge: 'Ritmo Imparable 🔥',
        clase: 'status-mid',
      };
    } else if (pct > 0) {
      return {
        titulo: '¡Buen camino iniciado!',
        texto: 'Cada hábito positivo suma a tu bienestar general. ¡Continúa con entusiasmo!',
        badge: 'En Progreso 💪',
        clase: 'status-start',
      };
    } else {
      return {
        titulo: '¡Comencemos con energía!',
        texto: 'Revisa tus objetivos activos y marca cada avance. ¡Tu nutriólogo está contigo!',
        badge: 'Primer Paso 🚀',
        clase: 'status-zero',
      };
    }
  });

  protected getOffsetGauge(pct: number): number {
    const clampPct = Math.min(100, Math.max(0, pct));
    return this.circunferenciaGauge - (clampPct / 100) * this.circunferenciaGauge;
  }

  protected setTab(tab: 'ACTIVAS' | 'REVISION' | 'LOGRADAS' | 'NO_LOGRADAS'): void {
    this.activeTab.set(tab);
  }

  protected marcarCumplida(meta: MetaResponse): void {
    this.processingId.set(meta.id);
    this.metaService
      .actualizarEstado(meta.id, { nuevoEstado: 'POR_VALIDAR' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('¡Objetivo enviado a revisión! Tu nutriólogo lo validará pronto.');
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

  protected agregarDificultadPredefinida(metaId: number, dificultad: string): void {
    const actual = (this.reportTexts()[metaId] ?? '').trim();
    const nuevoTexto = actual ? `${actual} • ${dificultad}` : dificultad;
    this.reportTexts.update(m => ({ ...m, [metaId]: nuevoTexto }));
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
          this.notificationService.info('Reporte enviado. Tu nutriólogo revisará tu caso para ajustar el plan.');
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
    if (!fecha) return 'Sin fecha';
    const date = new Date(fecha + 'T00:00:00');
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  protected diasRestantes(fecha: string): { texto: string; statusClass: string } {
    if (!fecha) return { texto: '', statusClass: '' };
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const target = new Date(fecha + 'T00:00:00');
    const diffTime = target.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { texto: `Venció hace ${Math.abs(diffDays)}d`, statusClass: 'countdown-overdue' };
    } else if (diffDays === 0) {
      return { texto: 'Para hoy ⚡', statusClass: 'countdown-today' };
    } else if (diffDays === 1) {
      return { texto: 'Mañana ⏳', statusClass: 'countdown-soon' };
    } else {
      return { texto: `Quedan ${diffDays} días`, statusClass: 'countdown-normal' };
    }
  }

  protected etiquetaEstado(estado: EstadoMeta): string {
    const labels: Record<EstadoMeta, string> = {
      PENDIENTE: 'En Curso',
      POR_VALIDAR: 'En Revisión',
      CUMPLIDA: '¡Logrado!',
      RECHAZADA: 'Reintentar',
      NO_CUMPLIDA: 'Requiere Ajuste',
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
}
