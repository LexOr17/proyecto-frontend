import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, of } from 'rxjs';
import { DiarioComidaService } from '../../service/diario-service';
import { PlanAlimenticioService } from '../../../planes/service/plan-service';
import { AuthService } from '../../../../core/services/auth-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';
import {
  DiarioComidaRequest,
  DiarioComidaResponse,
  EstadoRegistro,
  HORARIOS_LABEL,
  ESTADOS_LABEL,
  TipoComidaDiario,
} from '../../interfaces/diario.interface';
import {
  ComidaProgramadaResponse,
  PlanAlimenticioResponse,
} from '../../../planes/interfaces/plan.interface';

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface ModalContext {
  horario: TipoComidaDiario;
  nombre: string;
  comidaProgramadaId?: number;
}

export interface WeekDayItem {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  status: 'ALL_DONE' | 'PARTIAL' | 'EMPTY' | 'FUTURE';
  count: number;
}

@Component({
  selector: 'app-diario-paciente',
  imports: [ReactiveFormsModule],
  templateUrl: './diario-paciente.html',
  styleUrl: './diario-paciente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioPaciente {
  private readonly diarioService = inject(DiarioComidaService);
  private readonly planService = inject(PlanAlimenticioService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly horariosLabel = HORARIOS_LABEL;
  protected readonly estadosLabel = ESTADOS_LABEL;

  // ─── State ────────────────────────────────────────────────────────────
  protected readonly selectedDate = signal<Date>(new Date());
  protected readonly isModalOpen = signal(false);
  protected readonly modalContext = signal<ModalContext | null>(null);
  protected readonly entryBeingEdited = signal<DiarioComidaResponse | null>(null);
  protected readonly isSubmitting = signal(false);

  // ─── Data resources ───────────────────────────────────────────────────
  protected readonly historialResource = rxResource({
    stream: () => this.diarioService.obtenerMiHistorial(),
  });

  protected readonly planesResource = rxResource({
    params: () => this.authService.userId(),
    stream: ({ params }) =>
      params !== null
        ? this.planService
            .obtenerPlanesDePaciente(params)
            .pipe(map(r => r.datos ?? []))
        : of([] as PlanAlimenticioResponse[]),
  });

  // ─── Date computed ────────────────────────────────────────────────────
  protected readonly selectedDateStr = computed(() => toDateStr(this.selectedDate()));

  protected readonly selectedDateDisplay = computed(() =>
    this.selectedDate().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  protected readonly isToday = computed(
    () => toDateStr(new Date()) === this.selectedDateStr()
  );

  // ─── Week Days Strip ──────────────────────────────────────────────────
  protected readonly weekDays = computed((): WeekDayItem[] => {
    const curr = new Date(this.selectedDate());
    const dayOfWeek = (curr.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - dayOfWeek);

    const history = this.historialResource.value() ?? [];
    const todayStr = toDateStr(new Date());
    const selectedStr = this.selectedDateStr();

    const days: WeekDayItem[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = toDateStr(d);
      
      const dayEntries = history.filter(e => e.fecha === dStr);
      const isFut = dStr > todayStr;
      
      let status: 'ALL_DONE' | 'PARTIAL' | 'EMPTY' | 'FUTURE' = 'EMPTY';
      if (isFut) {
        status = 'FUTURE';
      } else if (dayEntries.length >= 3) {
        status = 'ALL_DONE';
      } else if (dayEntries.length > 0) {
        status = 'PARTIAL';
      }

      days.push({
        date: d,
        dateStr: dStr,
        dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
        dayNumber: d.getDate(),
        isToday: dStr === todayStr,
        isSelected: dStr === selectedStr,
        status,
        count: dayEntries.length,
      });
    }
    return days;
  });

  // ─── Racha de días ────────────────────────────────────────────────────
  protected readonly rachaDias = computed(() => {
    const history = this.historialResource.value() ?? [];
    const uniqueDates = new Set(history.map(h => h.fecha));
    let streak = 0;
    const check = new Date();
    
    const todayStr = toDateStr(check);
    if (!uniqueDates.has(todayStr)) {
      check.setDate(check.getDate() - 1);
    }

    while (uniqueDates.has(toDateStr(check))) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
    return streak;
  });

  // ─── Plan for selected date ───────────────────────────────────────────
  protected readonly activePlan = computed((): PlanAlimenticioResponse | null => {
    const planes = this.planesResource.value() ?? [];
    const [ys, ms, ds] = this.selectedDateStr().split('-').map(Number);
    const selected = new Date(ys, ms - 1, ds);
    return (
      planes.find(p => {
        const [y, m, d] = p.fechaInicio.split('-').map(Number);
        const inicio = new Date(y, m - 1, d);
        const fin = new Date(y, m - 1, d + p.duracionDias - 1);
        return selected >= inicio && selected <= fin;
      }) ?? null
    );
  });

  protected readonly diaDePlan = computed((): number | null => {
    const plan = this.activePlan();
    if (!plan) return null;
    const [y, m, d] = plan.fechaInicio.split('-').map(Number);
    const inicio = new Date(y, m - 1, d);
    const [ys, ms, ds] = this.selectedDateStr().split('-').map(Number);
    const selected = new Date(ys, ms - 1, ds);
    return (
      Math.floor((selected.getTime() - inicio.getTime()) / 86_400_000) + 1
    );
  });

  private static readonly ORDEN_HORARIO = [
    'DESAYUNO', 'ALMUERZO', 'COMIDA', 'MERIENDA', 'CENA', 'COLACION_1', 'COLACION_2',
  ];

  protected readonly comidasDelPlan = computed((): ComidaProgramadaResponse[] => {
    const plan = this.activePlan();
    const dia = this.diaDePlan();
    if (!plan || dia === null) return [];
    return plan.comidasProgramadas
      .filter(c => c.diaPlan === dia)
      .sort(
        (a, b) =>
          DiarioPaciente.ORDEN_HORARIO.indexOf(a.horario) -
          DiarioPaciente.ORDEN_HORARIO.indexOf(b.horario)
      );
  });

  // ─── Diary entries for selected date ─────────────────────────────────
  protected readonly todayEntries = computed(() =>
    (this.historialResource.value() ?? []).filter(
      e => e.fecha === this.selectedDateStr()
    )
  );

  /** Map comidaProgramadaId → diary entry (for plan meals) */
  protected readonly entriesByComidaId = computed(() => {
    const m = new Map<number, DiarioComidaResponse>();
    this.todayEntries().forEach(e => {
      if (e.comidaProgramadaId != null) m.set(e.comidaProgramadaId, e);
    });
    return m;
  });

  // ─── Progress ─────────────────────────────────────────────────────────
  protected readonly totalMeals = computed(() =>
    Math.max(this.comidasDelPlan().length, 1)
  );

  protected readonly registeredCount = computed(() =>
    this.comidasDelPlan().filter(c => this.entriesByComidaId().has(c.id)).length
  );

  protected readonly progressPercent = computed(() =>
    Math.round((this.registeredCount() / this.totalMeals()) * 100)
  );

  protected readonly circumference = 175.93;

  protected readonly strokeDashoffset = computed(() =>
    this.circumference - (this.circumference * this.progressPercent()) / 100
  );

  // ─── History sidebar ──────────────────────────────────────────────────
  protected readonly historialReciente = computed(() =>
    (this.historialResource.value() ?? [])
      .filter(e => e.fecha !== this.selectedDateStr())
      .slice(0, 10)
  );

  // ─── Form ─────────────────────────────────────────────────────────────
  protected readonly registroForm = this.fb.nonNullable.group({
    estado: ['CUMPLIDO' as EstadoRegistro, Validators.required],
    detallesComidaReal: ['', Validators.maxLength(255)],
  });

  protected get showDetalles(): boolean {
    return this.registroForm.get('estado')?.value === 'MODIFICADO';
  }

  protected isDetallesInvalid(): boolean {
    return FormValidatorHelper.isFieldInvalidTouchedOrDirty(this.registroForm.get('detallesComidaReal'));
  }

  // ─── Date navigation ──────────────────────────────────────────────────
  protected changeDate(delta: number): void {
    this.selectedDate.update(d => {
      const next = new Date(d);
      next.setDate(next.getDate() + delta);
      return next;
    });
  }

  protected selectDay(dStr: string): void {
    const [y, m, d] = dStr.split('-').map(Number);
    this.selectedDate.set(new Date(y, m - 1, d));
  }

  protected goToToday(): void {
    this.selectedDate.set(new Date());
  }

  protected jumpToDate(value: string): void {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    this.selectedDate.set(new Date(y, m - 1, d));
  }

  // ─── Meal icon helper ─────────────────────────────────────────────────
  protected getMealIcon(horario: string): string {
    const icons: Record<string, string> = {
      DESAYUNO: 'bx-sun',
      ALMUERZO: 'bx-bowl-hot',
      COMIDA: 'bx-dish',
      MERIENDA: 'bx-lemon',
      CENA: 'bx-moon',
      COLACION_1: 'bx-apple',
      COLACION_2: 'bx-cookie',
    };
    return icons[horario] ?? 'bx-food-menu';
  }

  // ─── Modal: open from plan card ───────────────────────────────────────
  protected openFromPlan(
    comida: ComidaProgramadaResponse,
    entry?: DiarioComidaResponse
  ): void {
    this.modalContext.set({
      horario: comida.horario as TipoComidaDiario,
      nombre: comida.plantillaNombre,
      comidaProgramadaId: comida.id,
    });
    this.entryBeingEdited.set(entry ?? null);
    this.registroForm.reset({
      estado: entry?.estado ?? 'CUMPLIDO',
      detallesComidaReal: entry?.detallesComidaReal ?? '',
    });
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    this.isModalOpen.set(false);
    this.registroForm.reset();
    this.modalContext.set(null);
    this.entryBeingEdited.set(null);
  }

  protected onEstadoChange(estado: EstadoRegistro): void {
    this.registroForm.patchValue({ estado });
    const detallesCtrl = this.registroForm.get('detallesComidaReal')!;
    if (estado === 'MODIFICADO') {
      detallesCtrl.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      detallesCtrl.clearValidators();
      detallesCtrl.setValidators([Validators.maxLength(255)]);
      this.registroForm.patchValue({ detallesComidaReal: '' });
    }
    detallesCtrl.updateValueAndValidity();
  }

  protected onSubmit(): void {
    if (this.registroForm.invalid || this.isSubmitting()) return;
    const ctx = this.modalContext();
    if (!ctx) return;

    const { estado, detallesComidaReal } = this.registroForm.getRawValue();
    const editing = this.entryBeingEdited();

    const dto: DiarioComidaRequest = {
      fecha: this.selectedDateStr(),
      horario: ctx.horario,
      estado,
      detallesComidaReal: detallesComidaReal || null,
      comidaProgramadaId: ctx.comidaProgramadaId ?? null,
    };

    this.isSubmitting.set(true);
    const request$ = editing
      ? this.diarioService.actualizar(editing.id, dto)
      : this.diarioService.registrar(dto);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notificationService.success(
          editing ? 'Registro actualizado correctamente.' : 'Comida registrada correctamente.'
        );
        this.historialResource.reload();
        this.closeModal();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  protected toLower(s: string): string {
    return s.toLowerCase();
  }

  protected formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
