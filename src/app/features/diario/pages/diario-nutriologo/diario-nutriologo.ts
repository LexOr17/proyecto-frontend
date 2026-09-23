import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { DiarioComidaService } from '../../service/diario-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import {
  DiarioComidaResponse,
  HORARIOS_LABEL,
  ESTADOS_LABEL,
} from '../../interfaces/diario.interface';
import { Paciente } from '../../../pacientes/interfaces/paciente.interface';

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface NutriWeekDayItem {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  entriesCount: number;
}

@Component({
  selector: 'app-diario-nutriologo',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './diario-nutriologo.html',
  styleUrl: './diario-nutriologo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioNutriologo {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly diarioService = inject(DiarioComidaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly horariosLabel = HORARIOS_LABEL;
  protected readonly estadosLabel = ESTADOS_LABEL;

  // ─── Route param ──────────────────────────────────────────────────────
  private readonly rawId = this.route.snapshot.paramMap.get('pacienteId');
  protected readonly pacienteId = signal<number | null>(
    this.rawId ? Number(this.rawId) : null
  );

  // ─── Patient Search & Autocomplete ────────────────────────────────────
  protected readonly searchTerm = signal<string>('');

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

  protected selectPaciente(id: number): void {
    this.router.navigate(['/main/diario/paciente', id]);
  }

  // ─── Patient data ─────────────────────────────────────────────────────
  protected readonly pacienteResource = rxResource({
    params: () => this.pacienteId(),
    stream: ({ params }) =>
      params !== null ? this.pacienteService.obtenerPacientePorId(params) : of(null),
  });

  protected readonly paciente = computed(() => this.pacienteResource.value());

  protected readonly pacienteNombre = computed(() => {
    const p = this.paciente();
    if (!p) return `Paciente #${this.pacienteId()}`;
    return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
  });

  protected readonly pacienteInitials = computed(() => {
    const p = this.paciente();
    if (!p) return 'P';
    const n = p.nombre ? p.nombre[0] : '';
    const a = p.apellidoPaterno ? p.apellidoPaterno[0] : '';
    return `${n}${a}`.toUpperCase();
  });

  // ─── Historial data ───────────────────────────────────────────────────
  protected readonly historialResource = rxResource({
    params: () => this.pacienteId(),
    stream: ({ params }) =>
      params !== null
        ? this.diarioService.obtenerHistorialPorPaciente(params)
        : of([] as DiarioComidaResponse[]),
  });

  // ─── Date navigation ──────────────────────────────────────────────────
  protected readonly selectedDate = signal<Date>(new Date());

  protected readonly selectedDateStr = computed(() => toDateStr(this.selectedDate()));

  protected readonly selectedDateDisplay = computed(() => {
    const d = this.selectedDate();
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  protected readonly isToday = computed(
    () => toDateStr(new Date()) === this.selectedDateStr()
  );

  protected readonly filteredEntries = computed(() => {
    const entries = this.historialResource.value() ?? [];
    return entries.filter(e => e.fecha === this.selectedDateStr());
  });

  // ─── Week Days Strip ──────────────────────────────────────────────────
  protected readonly weekDays = computed((): NutriWeekDayItem[] => {
    const curr = new Date(this.selectedDate());
    const dayOfWeek = (curr.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - dayOfWeek);

    const history = this.historialResource.value() ?? [];
    const todayStr = toDateStr(new Date());
    const selectedStr = this.selectedDateStr();

    const days: NutriWeekDayItem[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = toDateStr(d);
      
      const dayEntries = history.filter(e => e.fecha === dStr);

      days.push({
        date: d,
        dateStr: dStr,
        dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', ''),
        dayNumber: d.getDate(),
        isToday: dStr === todayStr,
        isSelected: dStr === selectedStr,
        entriesCount: dayEntries.length,
      });
    }
    return days;
  });

  // ─── Resumen de Adherencia del Día ────────────────────────────────────
  protected readonly cumplidasCount = computed(() =>
    this.filteredEntries().filter(e => e.estado === 'CUMPLIDO').length
  );
  protected readonly modificadasCount = computed(() =>
    this.filteredEntries().filter(e => e.estado === 'MODIFICADO').length
  );
  protected readonly saltadasCount = computed(() =>
    this.filteredEntries().filter(e => e.estado === 'SALTADA').length
  );

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

  // ─── Observation modal ────────────────────────────────────────────────
  protected readonly isObsModalOpen = signal(false);
  protected readonly obsEntry = signal<DiarioComidaResponse | null>(null);
  protected readonly isSubmittingObs = signal(false);

  protected readonly quickChips: string[] = [
    '¡Excelente apego al plan!',
    'Recuerda cuidar la porción de carbohidratos.',
    'Procura no saltar este horario de comida.',
    'Buena sustitución de alimentos, continúa así.',
    'Asegúrate de tomar suficiente agua durante el día.',
  ];

  protected readonly obsForm = this.fb.nonNullable.group({
    observacion: ['', [Validators.required, Validators.maxLength(500)]],
  });

  protected applyQuickChip(chip: string): void {
    const current = this.obsForm.get('observacion')?.value || '';
    if (!current) {
      this.obsForm.patchValue({ observacion: chip });
    } else {
      this.obsForm.patchValue({ observacion: `${current} ${chip}` });
    }
  }

  protected openObsModal(entry: DiarioComidaResponse): void {
    this.obsEntry.set(entry);
    this.obsForm.reset({ observacion: entry.observacionNutriologo ?? '' });
    this.isObsModalOpen.set(true);
  }

  protected closeObsModal(): void {
    this.isObsModalOpen.set(false);
    this.obsEntry.set(null);
  }

  protected onSubmitObs(): void {
    if (this.obsForm.invalid || this.isSubmittingObs()) return;
    const entry = this.obsEntry();
    if (entry === null) return;

    const { observacion } = this.obsForm.getRawValue();
    this.isSubmittingObs.set(true);

    this.diarioService
      .agregarObservacion(entry.id, { observacion })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Observación guardada exitosamente.');
          this.historialResource.reload();
          this.closeObsModal();
          this.isSubmittingObs.set(false);
        },
        error: () => {
          this.isSubmittingObs.set(false);
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

  protected get isFutureDate(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.selectedDate() > today;
  }
}
