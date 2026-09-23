import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MetaService } from '../../service/meta-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';
import { EstadoMeta, MetaRequest, MetaResponse } from '../../interfaces/meta.interface';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

@Component({
  selector: 'app-metas-nutriologo',
  imports: [ReactiveFormsModule, RouterLink, Pagination],
  templateUrl: './metas-nutriologo.html',
  styleUrl: './metas-nutriologo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetasNutriologo {
  private readonly metaService = inject(MetaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly validator = FormValidatorHelper;

  protected readonly pacienteId = Number(
    this.route.snapshot.paramMap.get('pacienteId') ?? '0'
  );

  protected readonly currentPage = signal(0);
  protected readonly pageSize = signal(6);
  protected readonly isSubmitting = signal(false);
  protected readonly editingMeta = signal<MetaResponse | null>(null);
  protected readonly processingId = signal<number | null>(null);
  protected readonly observacionesMap = signal<Record<number, string>>({});

  // Filtros interactivos
  protected readonly filtroEstado = signal<'TODOS' | EstadoMeta>('TODOS');
  protected readonly searchTerm = signal<string>('');

  // Fecha mínima para nuevas metas (hoy)
  protected readonly hoyFechaStr = new Date().toISOString().split('T')[0];

  // Plantillas clínicas rápidas
  protected readonly plantillasRapidas = [
    { label: '💧 Hidratación 2L', texto: 'Beber al menos 2 litros de agua natural distribuidos a lo largo del día.' },
    { label: '🥗 Porción de Verduras', texto: 'Añadir 1 porción abundante de verduras frescas o al vapor en comida y cena.' },
    { label: '🚶 8,000 Pasos', texto: 'Completar un mínimo de 8,000 pasos diarios o 30 minutos de caminata continua.' },
    { label: '🌙 Sueño 7-8h', texto: 'Dormir entre 7 y 8 horas continuas para optimizar la recuperación metabólica.' },
    { label: '🚫 Sin ultraprocesados', texto: 'Eliminar el consumo de bebidas azucaradas y harinas refinadas durante la noche.' },
  ];

  private readonly editModalRef = viewChild<ElementRef<HTMLElement>>('editModal');

  protected readonly pacienteResource = rxResource({
    params: () => this.pacienteId,
    stream: ({ params }) => this.pacienteService.obtenerPacientePorId(params),
  });

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

  protected readonly metasPorValidar = computed(() =>
    (this.metasResource.value()?.content ?? []).filter(m => m.estado === 'POR_VALIDAR')
  );

  protected readonly metasActivas = computed(() =>
    (this.metasResource.value()?.content ?? []).filter(m => m.estado === 'PENDIENTE')
  );

  protected readonly tieneMetasDestacadas = computed(
    () => this.metasPorValidar().length > 0 || this.metasActivas().length > 0
  );

  protected readonly porcentajeExito = computed(() => {
    const c = this.conteoResource.value();
    if (!c) return 0;
    const pct = c.porcentaje ?? c.porcentajeExito ?? (c.total > 0 ? (c.cumplidas / c.total) * 100 : 0);
    return Math.min(100, Math.max(0, Math.round(pct)));
  });

  // Nivel de adherencia clínico
  protected readonly nivelCumplimiento = computed(() => {
    const pct = this.porcentajeExito();
    const total = this.conteoResource.value()?.total ?? 0;
    if (total === 0) return { label: 'Sin Objetivos', class: 'level-neutral', icon: 'bx-info-circle' };
    if (pct >= 80) return { label: 'Adherencia Excelente', class: 'level-excellent', icon: 'bx-award' };
    if (pct >= 50) return { label: 'Progreso Estable', class: 'level-good', icon: 'bx-trending-up' };
    return { label: 'Requiere Refuerzo', class: 'level-warning', icon: 'bx-error-circle' };
  });

  // Métricas para el Gauge circular
  protected readonly radioGauge = 42;
  protected readonly circunferenciaGauge = 2 * Math.PI * 42;

  protected getOffsetGauge(pct: number): number {
    const clampPct = Math.min(100, Math.max(0, pct));
    return this.circunferenciaGauge - (clampPct / 100) * this.circunferenciaGauge;
  }

  // Lista filtrada en tiempo real
  protected readonly metasFiltradas = computed(() => {
    const all = this.metasResource.value()?.content ?? [];
    const filtro = this.filtroEstado();
    const query = this.searchTerm().trim().toLowerCase();

    return all.filter(m => {
      const matchEstado = filtro === 'TODOS' ? true : m.estado === filtro;
      const matchQuery = query ? m.descripcion.toLowerCase().includes(query) : true;
      return matchEstado && matchQuery;
    });
  });

  protected readonly nuevaMetaForm = this.fb.group({
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
    fechaObjetivo: ['', Validators.required],
  });

  protected readonly editMetaForm = this.fb.group({
    descripcion: ['', [Validators.required, Validators.minLength(10)]],
    fechaObjetivo: ['', Validators.required],
  });

  constructor() {
    afterRenderEffect(() => {
      if (this.editingMeta()) {
        this.editModalRef()?.nativeElement
          .querySelector<HTMLElement>('textarea, input')
          ?.focus();
      }
    });
  }

  protected aplicarPlantilla(texto: string): void {
    this.nuevaMetaForm.patchValue({ descripcion: texto });
    this.nuevaMetaForm.get('descripcion')?.markAsDirty();
  }

  protected establecerFechaDias(dias: number): void {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    const iso = d.toISOString().split('T')[0];
    this.nuevaMetaForm.patchValue({ fechaObjetivo: iso });
    this.nuevaMetaForm.get('fechaObjetivo')?.markAsDirty();
  }

  protected setFiltro(estado: 'TODOS' | EstadoMeta): void {
    this.filtroEstado.set(estado);
  }

  protected onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
  }

  protected crearMeta(): void {
    if (this.nuevaMetaForm.invalid) {
      this.nuevaMetaForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const { descripcion, fechaObjetivo } = this.nuevaMetaForm.value;
    const request: MetaRequest = {
      descripcion: descripcion!,
      fechaObjetivo: fechaObjetivo!,
      pacienteId: this.pacienteId,
    };
    this.metaService
      .crearMeta(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Objetivo asignado correctamente');
          this.nuevaMetaForm.reset();
          this.isSubmitting.set(false);
          this.metasResource.reload();
          this.conteoResource.reload();
        },
        error: () => this.isSubmitting.set(false),
      });
  }

  protected abrirEdicion(meta: MetaResponse): void {
    this.editingMeta.set(meta);
    this.editMetaForm.patchValue({
      descripcion: meta.descripcion,
      fechaObjetivo: meta.fechaObjetivo,
    });
  }

  protected cerrarEdicion(): void {
    this.editingMeta.set(null);
    this.editMetaForm.reset();
  }

  protected guardarEdicion(): void {
    if (this.editMetaForm.invalid) {
      this.editMetaForm.markAllAsTouched();
      return;
    }
    const meta = this.editingMeta();
    if (!meta) return;
    const { descripcion, fechaObjetivo } = this.editMetaForm.value;
    const request: MetaRequest = {
      descripcion: descripcion!,
      fechaObjetivo: fechaObjetivo!,
      pacienteId: this.pacienteId,
    };
    this.metaService
      .actualizarMeta(meta.id, request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Objetivo actualizado correctamente');
          this.cerrarEdicion();
          this.metasResource.reload();
          this.conteoResource.reload();
        },
      });
  }

  protected async eliminarMeta(meta: MetaResponse): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar objetivo',
      '¿Estás seguro de eliminar este objetivo? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    this.processingId.set(meta.id);
    this.metaService
      .eliminarMeta(meta.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Objetivo eliminado');
          this.processingId.set(null);
          this.metasResource.reload();
          this.conteoResource.reload();
        },
        error: () => this.processingId.set(null),
      });
  }

  protected actualizarEstado(meta: MetaResponse, nuevoEstado: EstadoMeta): void {
    const observaciones = this.observacionesMap()[meta.id] ?? '';
    this.processingId.set(meta.id);
    this.metaService
      .actualizarEstado(meta.id, { nuevoEstado, observaciones })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Estado actualizado correctamente');
          this.processingId.set(null);
          this.observacionesMap.update(m => {
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

  protected setObservacion(metaId: number, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.observacionesMap.update(m => ({ ...m, [metaId]: value }));
  }

  protected getObservacion(metaId: number): string {
    return this.observacionesMap()[metaId] ?? '';
  }

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
  }

  protected onModalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.cerrarEdicion();
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
      return { texto: `Venció hace ${Math.abs(diffDays)}d`, statusClass: 'date-overdue' };
    } else if (diffDays === 0) {
      return { texto: 'Vence hoy', statusClass: 'date-today' };
    } else if (diffDays === 1) {
      return { texto: 'Vence mañana', statusClass: 'date-soon' };
    } else {
      return { texto: `${diffDays} días restantes`, statusClass: 'date-future' };
    }
  }

  protected etiquetaEstado(estado: EstadoMeta): string {
    const labels: Record<EstadoMeta, string> = {
      PENDIENTE: 'En Seguimiento',
      POR_VALIDAR: 'Por Validar',
      CUMPLIDA: 'Logrado',
      RECHAZADA: 'Rechazado',
      NO_CUMPLIDA: 'No Cumplido',
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

  protected nombrePaciente(): string {
    const p = this.pacienteResource.value();
    if (!p) return 'Paciente';
    return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
  }
}
