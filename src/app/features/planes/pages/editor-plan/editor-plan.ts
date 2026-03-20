import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PlanAlimenticioService } from '../../service/plan-service';
import { PlantillaService } from '../../../plantillas/service/plantilla-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { AuthService } from '../../../../core/services/auth-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { TIPOS_COMIDA, TipoComida } from '../../../plantillas/interfaces/plantilla.interface';
import { Plantilla } from '../../../plantillas/interfaces/plantilla.interface';
import {
  ComidaLocal,
  PlanAlimenticioRequest,
  PlanCreacionState,
} from '../../interfaces/plan.interface';

@Component({
  selector: 'app-editor-plan',
  imports: [],
  templateUrl: './editor-plan.html',
  styleUrl: './editor-plan.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPlan {
  private readonly planService = inject(PlanAlimenticioService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Route / mode ────────────────────────────────────────────────────
  protected readonly planId = signal<number | null>(
    this.route.snapshot.paramMap.has('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : null,
  );
  protected readonly modoEdicion = computed(() => this.planId() !== null);

  // ─── Plan metadata ────────────────────────────────────────────────────
  protected planNombre = signal('');
  protected planFechaInicio = signal('');
  protected planDuracionDias = signal(0);
  protected pacienteId = signal(0);
  protected pacienteNombre = signal('');

  // ─── Calendar state ───────────────────────────────────────────────────
  protected comidas = signal<ComidaLocal[]>([]);

  protected comidasMap = computed(() => {
    const m = new Map<string, ComidaLocal>();
    for (const c of this.comidas()) {
      m.set(`${c.diaPlan}-${c.horario}`, c);
    }
    return m;
  });

  protected diasPlan = computed(() => {
    const duracion = this.planDuracionDias();
    const fechaInicio = this.planFechaInicio();
    if (!fechaInicio || duracion <= 0) return [];
    const [y, m, d] = fechaInicio.split('-').map(Number);
    return Array.from({ length: duracion }, (_, i) => {
      const date = new Date(y, m - 1, d + i);
      return {
        dia: i + 1,
        fechaStr: date.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
      };
    });
  });

  // ─── Copy state ───────────────────────────────────────────────────────
  protected diaCopiado = signal<number | null>(null);
  protected comidaIndividualCopiada = signal<ComidaLocal | null>(null);

  protected modoCopiaActivo = computed(
    () => this.diaCopiado() !== null || this.comidaIndividualCopiada() !== null,
  );

  protected etiquetaCopia = computed(() => {
    const dia = this.diaCopiado();
    const comida = this.comidaIndividualCopiada();
    if (dia !== null) return `Pegando Día ${dia}...`;
    if (comida !== null) {
      const label = TIPOS_COMIDA.find(t => t.value === comida.horario)?.label ?? comida.horario;
      return `Pegando ${label}...`;
    }
    return '';
  });

  // ─── Food bank modal ──────────────────────────────────────────────────
  protected bancalAbierto = signal(false);
  protected celdaActiva = signal<{ diaPlan: number; horario: TipoComida } | null>(null);
  protected buscadorTermino = signal('');
  protected filtroTipoComida = signal<TipoComida | 'TODOS'>('TODOS');

  // ─── Edit meal modal ──────────────────────────────────────────────────
  protected editModalAbierto = signal(false);
  protected comidaEditando = signal<ComidaLocal | null>(null);
  protected observacionesEdit = signal('');

  // ─── Save state ───────────────────────────────────────────────────────
  protected isSaving = signal(false);

  // ─── Constants ───────────────────────────────────────────────────────
  protected readonly HORARIOS = TIPOS_COMIDA;
  protected readonly HORARIOS_FILTRO: { value: TipoComida | 'TODOS'; label: string; icon: string }[] = [
    { value: 'TODOS', label: 'Todos', icon: '🍽️' },
    ...TIPOS_COMIDA,
  ];

  // ─── Plantillas resource (food bank) ─────────────────────────────────
  protected readonly plantillasResource = rxResource({
    stream: () => this.plantillaService.obtenerPlantillas(0, 100),
  });

  protected readonly plantillasFiltradas = computed(() => {
    const todas = this.plantillasResource.value()?.content ?? [];
    const term = this.buscadorTermino().toLowerCase().trim();
    const filtro = this.filtroTipoComida();
    return todas
      .filter(p => filtro === 'TODOS' || p.tipoComida === filtro)
      .filter(p => !term || p.nombre.toLowerCase().includes(term));
  });

  private readonly kcalById = computed(() => {
    const m = new Map<number, number>();
    for (const p of (this.plantillasResource.value()?.content ?? [])) {
      m.set(p.id, p.alimentos.reduce((sum, a) => sum + a.calorias, 0));
    }
    return m;
  });

  // ─── Plan resource (edit mode) ────────────────────────────────────────
  protected readonly planResource = rxResource({
    params: () => {
      const id = this.planId();
      return id ? { id } : undefined;
    },
    stream: ({ params }) =>
      this.planService.obtenerPlanPorId(params.id).pipe(map(r => r.datos)),
  });

  constructor() {
    // New mode: read navigation state
    const state = history.state as PlanCreacionState;
    if (!this.modoEdicion()) {
      if (!state?.pacienteId) {
        this.router.navigate(['/main/planes']);
        return;
      }
      this.planNombre.set(state.nombre ?? '');
      this.planFechaInicio.set(state.fechaInicio ?? '');
      this.planDuracionDias.set(state.duracionDias ?? 7);
      this.pacienteId.set(state.pacienteId);
      this.pacienteNombre.set(state.pacienteNombre ?? '');
    }

    // Edit mode: populate from API response
    effect(() => {
      const plan = this.planResource.value();
      if (!plan) return;
      untracked(() => {
        this.planNombre.set(plan.nombre);
        this.planFechaInicio.set(plan.fechaInicio);
        this.planDuracionDias.set(plan.duracionDias);
        this.pacienteId.set(plan.pacienteId);
        this.comidas.set(
          plan.comidasProgramadas.map(c => ({
            id: c.id,
            plantillaId: c.plantillaId,
            plantillaNombre: c.plantillaNombre,
            diaPlan: c.diaPlan,
            horario: c.horario,
            observaciones: c.observaciones ?? '',
          })),
        );
        // Load patient name separately
        this.pacienteService
          .obtenerPacientePorId(plan.pacienteId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(p => this.pacienteNombre.set(`${p.nombre} ${p.apellidoPaterno}`));
      });
    });
  }

  // ─── Calendar helpers ─────────────────────────────────────────────────
  protected getComida(diaPlan: number, horario: TipoComida): ComidaLocal | undefined {
    return this.comidasMap().get(`${diaPlan}-${horario}`);
  }

  protected getKcal(plantillaId: number): number {
    return this.kcalById().get(plantillaId) ?? 0;
  }

  protected getLabelHorario(horario: TipoComida): string {
    return TIPOS_COMIDA.find(t => t.value === horario)?.label ?? horario;
  }

  protected puedesPegarComida(horario: TipoComida): boolean {
    const copiada = this.comidaIndividualCopiada();
    return copiada !== null && copiada.horario === horario;
  }

  protected formatearFechaInicio(): string {
    const f = this.planFechaInicio();
    if (!f) return '';
    const [y, m, d] = f.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  // ─── Food bank modal ──────────────────────────────────────────────────
  protected abrirBancoAlimentos(diaPlan: number, horario: TipoComida): void {
    this.celdaActiva.set({ diaPlan, horario });
    this.filtroTipoComida.set(horario);
    this.buscadorTermino.set('');
    this.bancalAbierto.set(true);
  }

  protected asignarPlantilla(plantilla: Plantilla): void {
    const celda = this.celdaActiva();
    if (!celda) return;
    const nuevaComida: ComidaLocal = {
      plantillaId: plantilla.id,
      plantillaNombre: plantilla.nombre,
      diaPlan: celda.diaPlan,
      horario: celda.horario,
      observaciones: '',
    };
    this.comidas.update(comidas => [
      ...comidas.filter(c => !(c.diaPlan === celda.diaPlan && c.horario === celda.horario)),
      nuevaComida,
    ]);
    this.bancalAbierto.set(false);
    this.celdaActiva.set(null);
  }

  protected cerrarBancoAlimentos(): void {
    this.bancalAbierto.set(false);
    this.celdaActiva.set(null);
  }

  protected setFiltroTipoComida(filtro: TipoComida | 'TODOS'): void {
    this.filtroTipoComida.set(filtro);
  }

  protected onBuscadorChange(event: Event): void {
    this.buscadorTermino.set((event.target as HTMLInputElement).value);
  }

  // ─── Edit meal modal ──────────────────────────────────────────────────
  protected abrirEditorComida(comida: ComidaLocal): void {
    this.comidaEditando.set(comida);
    this.observacionesEdit.set(comida.observaciones);
    this.editModalAbierto.set(true);
  }

  protected guardarObservaciones(): void {
    const editando = this.comidaEditando();
    if (!editando) return;
    this.comidas.update(comidas =>
      comidas.map(c =>
        c.diaPlan === editando.diaPlan && c.horario === editando.horario
          ? { ...c, observaciones: this.observacionesEdit() }
          : c,
      ),
    );
    this.editModalAbierto.set(false);
    this.comidaEditando.set(null);
  }

  protected eliminarComidaEditando(): void {
    const editando = this.comidaEditando();
    if (!editando) return;
    this.comidas.update(comidas =>
      comidas.filter(
        c => !(c.diaPlan === editando.diaPlan && c.horario === editando.horario),
      ),
    );
    this.editModalAbierto.set(false);
    this.comidaEditando.set(null);
  }

  protected cerrarEditModal(): void {
    this.editModalAbierto.set(false);
    this.comidaEditando.set(null);
  }

  protected onObservacionesChange(event: Event): void {
    this.observacionesEdit.set((event.target as HTMLInputElement).value);
  }

  // ─── Direct cell remove ───────────────────────────────────────────────
  protected eliminarComidaDirecta(comida: ComidaLocal, event: Event): void {
    event.stopPropagation();
    this.comidas.update(comidas =>
      comidas.filter(
        c => !(c.diaPlan === comida.diaPlan && c.horario === comida.horario),
      ),
    );
  }

  // ─── Copy / Paste ─────────────────────────────────────────────────────
  protected copiarDia(dia: number, event: Event): void {
    event.stopPropagation();
    this.diaCopiado.set(dia);
    this.comidaIndividualCopiada.set(null);
  }

  protected pegarDia(diaDestino: number, event: Event): void {
    event.stopPropagation();
    const origen = this.diaCopiado();
    if (origen === null) return;
    const comidasOrigen = this.comidas().filter(c => c.diaPlan === origen);
    this.comidas.update(comidas => [
      ...comidas.filter(c => c.diaPlan !== diaDestino),
      ...comidasOrigen.map(c => ({ ...c, diaPlan: diaDestino, id: undefined })),
    ]);
  }

  protected copiarComida(comida: ComidaLocal, event: Event): void {
    event.stopPropagation();
    this.comidaIndividualCopiada.set({ ...comida });
    this.diaCopiado.set(null);
  }

  protected pegarComidaEnCelda(diaPlan: number, horario: TipoComida, event: Event): void {
    event.stopPropagation();
    const copiada = this.comidaIndividualCopiada();
    if (!copiada) return;
    this.comidas.update(comidas => [
      ...comidas.filter(c => !(c.diaPlan === diaPlan && c.horario === horario)),
      { ...copiada, diaPlan, horario, id: undefined },
    ]);
  }

  protected cancelarCopia(): void {
    this.diaCopiado.set(null);
    this.comidaIndividualCopiada.set(null);
  }

  // ─── Save / Delete ────────────────────────────────────────────────────
  protected guardarPlan(): void {
    if (this.comidas().length === 0) {
      this.notificationService.error('El plan debe contener al menos una comida programada');
      return;
    }
    this.isSaving.set(true);

    const request: PlanAlimenticioRequest = {
      nombre: this.planNombre(),
      fechaInicio: this.planFechaInicio(),
      duracionDias: this.planDuracionDias(),
      pacienteId: this.pacienteId(),
      nutriologoId: this.authService.userId()!,
      comidas: this.comidas().map(c => ({
        plantillaId: c.plantillaId,
        diaPlan: c.diaPlan,
        horario: c.horario,
        ...(c.observaciones ? { observaciones: c.observaciones } : {}),
      })),
    };

    const op = this.modoEdicion()
      ? this.planService.actualizarPlan(this.planId()!, request)
      : this.planService.crearPlan(request);

    op.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notificationService.success(
          this.modoEdicion() ? 'Plan actualizado correctamente' : 'Plan creado exitosamente',
        );
        this.router.navigate(['/main/planes']);
      },
      error: (err: { error?: { mensaje?: string } }) => {
        this.isSaving.set(false);
        this.notificationService.error(err?.error?.mensaje ?? 'Error al guardar el plan');
      },
    });
  }

  protected async eliminarPlan(): Promise<void> {
    const id = this.planId();
    if (!id) return;
    const confirmed = await this.confirmDialog.open(
      'Eliminar plan alimenticio',
      '¿Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;
    this.planService
      .eliminarPlan(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Plan eliminado correctamente');
          this.router.navigate(['/main/planes']);
        },
      });
  }

  protected volver(): void {
    this.router.navigate(['/main/planes']);
  }
}
