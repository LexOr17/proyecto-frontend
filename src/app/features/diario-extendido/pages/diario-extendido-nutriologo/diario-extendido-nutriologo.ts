import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { DiarioExtendidoService } from '../../service/diario-extendido-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';
import {
    DiarioExtendidoResponse,
    TipoActividad,
    ESTADO_ANIMO_MAP,
    CALIDAD_SUENO_MAP,
    SINTOMA_LABEL,
    TIPO_ACTIVIDAD_LABEL,
} from '../../interfaces/diario-extendido.interface';
import { Paciente } from '../../../pacientes/interfaces/paciente.interface';

interface WeekDay {
    date: Date;
    iso: string;
    dayName: string;
    dayNum: number;
}

@Component({
    selector: 'app-diario-extendido-nutriologo',
    imports: [ReactiveFormsModule, RouterLink, Pagination],
    templateUrl: './diario-extendido-nutriologo.html',
    styleUrl: './diario-extendido-nutriologo.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioExtendidoNutriologo implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly service = inject(DiarioExtendidoService);
    private readonly pacienteService = inject(PacienteService);
    private readonly notificationService = inject(NotificationService);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly today = new Date();
    protected readonly pacienteId = signal<number | null>(null);
    protected readonly isSaving = signal(false);
    protected readonly currentPage = signal(0);
    protected readonly pageSize = signal(10);
    protected readonly selectedDateIso = signal<string>(this.localDateISO(new Date()));
    protected readonly expandedRowId = signal<number | null>(null);

    // ─── Patient Picker (when no patient selected) ──────────────────────
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
        this.router.navigate(['/main/diario-extendido/paciente', id]);
        this.pacienteId.set(id);
    }

    protected readonly ESTADO_ANIMO_MAP = ESTADO_ANIMO_MAP;
    protected readonly CALIDAD_SUENO_MAP = CALIDAD_SUENO_MAP;
    protected readonly SINTOMA_LABEL = SINTOMA_LABEL;
    protected readonly TIPO_ACTIVIDAD_LABEL = TIPO_ACTIVIDAD_LABEL;
    protected readonly tiposActividad = Object.keys(TIPO_ACTIVIDAD_LABEL) as TipoActividad[];

    protected readonly pacienteResource = rxResource({
        params: () => ({ id: this.pacienteId() }),
        stream: ({ params }) => {
            if (!params.id) return of(null);
            return this.pacienteService.obtenerPacientePorId(params.id);
        },
    });

    protected readonly historyResource = rxResource({
        params: () => ({
            pacienteId: this.pacienteId(),
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

    protected readonly historyContent = computed(
        () => this.historyResource.value()?.content ?? [],
    );

    private localDateISO(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    protected readonly weekDays = computed<WeekDay[]>(() => {
        const today = this.today;
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(today);
            day.setDate(today.getDate() + i);
            return {
                date: day,
                iso: this.localDateISO(day),
                dayName: day.toLocaleDateString('es-ES', { weekday: 'short' }),
                dayNum: day.getDate(),
            };
        });
    });

    protected readonly selectedDateLabel = computed(() => {
        const iso = this.selectedDateIso();
        const [year, month, day] = iso.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date
            .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
            .toUpperCase();
    });

    protected readonly selectedDiary = computed(() =>
        this.historyContent().find(d => d.fecha === this.selectedDateIso()) ?? null,
    );

    // --- STATS ---
    //   protected readonly animoStats = computed(() => {
    //     const data = this.historyContent();
    //     if (!data.length) return { label: '— Sin datos suficientes', score: '—/5' };
    //     const total = data.reduce((acc, d) => acc + ESTADO_ANIMO_MAP[d.estadoAnimo].score, 0);
    //     const avg = Math.round(total / data.length);
    //     const level = avg >= 5 ? 'Excelente' : avg >= 4 ? 'Estable' : avg >= 3 ? 'Regular' : avg >= 2 ? 'Inestable' : 'Crítico';
    //     const entry = Object.values(ESTADO_ANIMO_MAP).find(v => v.score === avg);
    //     return {
    //       label: `${entry?.emoji ?? '😐'} Bienestar ${level}`,
    //       score: `${avg}/5`,
    //     };
    //   });

    //   protected readonly suenoStats = computed(() => {
    //     const data = this.historyContent();
    //     if (!data.length) return { label: '— Sin datos', horas: '—' };
    //     const totalH = data.reduce(
    //       (acc, d) => acc + CALIDAD_SUENO_MAP[d.calidadSueno].horas,
    //       0,
    //     );
    //     const avg = (totalH / data.length).toFixed(1);
    //     const label =
    //       Number(avg) >= 8.5
    //         ? '🌙 Excelente Descanso'
    //         : Number(avg) >= 7
    //         ? '🌙 Buen Descanso'
    //         : Number(avg) < 6
    //         ? '🌙 Deuda de Sueño'
    //         : '🌙 Descanso Regular';
    //     return { label, horas: avg };
    //   });

    // --- STATS BLINDADAS ---
    protected readonly animoStats = computed(() => {
        // Filtramos solo los registros que tienen estadoAnimo definido
        const data = this.historyContent().filter(d => d.estadoAnimo != null);

        if (!data.length) return { label: '— Sin registros completados', score: '—/5' };

        const total = data.reduce((acc, d) => {
            const score = this.ESTADO_ANIMO_MAP[d.estadoAnimo]?.score || 0;
            return acc + score;
        }, 0);

        const avg = Math.round(total / data.length);
        const level = avg >= 5 ? 'Excelente' : avg >= 4 ? 'Estable' : avg >= 3 ? 'Regular' : avg >= 2 ? 'Inestable' : 'Crítico';

        // Buscamos el emoji correspondiente al puntaje promedio
        const entry = Object.values(this.ESTADO_ANIMO_MAP).find(v => v.score === avg);

        return {
            label: `${entry?.emoji ?? '😐'} Bienestar ${level}`,
            score: `${avg}/5`,
        };
    });

    protected readonly suenoStats = computed(() => {
        // Filtramos solo los que tienen calidadSueno definida
        const data = this.historyContent().filter(d => d.calidadSueno != null);

        if (!data.length) return { label: '— Sin datos de sueño', horas: '—' };

        const totalH = data.reduce(
            (acc, d) => acc + (this.CALIDAD_SUENO_MAP[d.calidadSueno]?.horas || 0),
            0,
        );

        const avg = (totalH / data.length).toFixed(1);
        const avgNum = Number(avg);

        const label = avgNum >= 8.5 ? '🌙 Excelente Descanso'
            : avgNum >= 7 ? '🌙 Buen Descanso'
                : avgNum < 6 ? '🌙 Deuda de Sueño'
                    : '🌙 Descanso Regular';

        return { label, horas: avg };
    });

    protected readonly adherenciaStats = computed(() => {
        const data = this.historyContent();
        const withSuggestion = data.filter(
            d => d.tipoActividadSugerida && d.tipoActividadSugerida !== 'NINGUNA',
        );
        if (!withSuggestion.length) return { porcentaje: 0, label: '📈 Sin actividades programadas' };
        const done = withSuggestion.filter(d => d.actividadRealizada).length;
        const pct = Math.round((done / withSuggestion.length) * 100);
        return { porcentaje: pct, label: `📈 ${pct}% de Cumplimiento` };
    });

    protected readonly sintomaStats = computed(() => {
        const data = this.historyContent();
        const withSyntom = data.filter(d => d.sintomaPrincipal !== 'NINGUNO');
        if (!withSyntom.length) {
            return { alerta: '✅ Sin alertas de síntomas', frecuencia: `Frecuencia: 0/${data.length} días` };
        }
        const topLabel = SINTOMA_LABEL[withSyntom[0].sintomaPrincipal];
        return {
            alerta: `⚠️ ${topLabel}`,
            frecuencia: `Frecuencia: ${withSyntom.length}/${data.length} días`,
        };
    });

    protected readonly pacienteInitials = computed(() => {
        const p = this.pacienteResource.value();
        if (!p) return '?';
        return (p.nombre.charAt(0) + p.apellidoPaterno.charAt(0)).toUpperCase();
    });

    // Suggestion form
    protected readonly suggestionForm = this.fb.group({
        tipoActividadSugerida: this.fb.control<TipoActividad>('NINGUNA', { nonNullable: true }),
        actividadDetalle: this.fb.control('', { nonNullable: true }),
        observacionesNutriologo: this.fb.control('', { nonNullable: true }),
    });

    ngOnInit(): void {
        const idStr = this.route.snapshot.paramMap.get('pacienteId');
        if (idStr) {
            this.pacienteId.set(Number(idStr));
        }
    }

    protected onDateSelect(iso: string): void {
        this.selectedDateIso.set(iso);
        const diary = this.historyContent().find(d => d.fecha === iso);
        this.suggestionForm.patchValue({
            tipoActividadSugerida: diary?.tipoActividadSugerida ?? 'NINGUNA',
            actividadDetalle: diary?.actividadDetalle ?? '',
            observacionesNutriologo: diary?.observacionesNutriologo ?? '',
        });
    }

    protected onPageChange(event: PageEvent): void {
        this.currentPage.set(event.page);
        this.pageSize.set(event.size);
    }

    protected toggleRow(id: number): void {
        this.expandedRowId.update(current => (current === id ? null : id));
    }

    protected formatFecha(iso: string): string {
        const [year, month, day] = iso.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date
            .toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
            .toUpperCase();
    }

    protected hasEntryForDate(iso: string): boolean {
        return this.historyContent().some(d => d.fecha === iso);
    }

    protected formatBebidas(entry: DiarioExtendidoResponse): string {
        if (!entry.bebidas?.length) return '—';
        return entry.bebidas.map(b => `${b.nombre} (${b.cantidad} ml)`).join(', ');
    }

    protected onSuggestionSubmit(): void {
        const pid = this.pacienteId();
        if (!pid || this.isSaving()) return;

        this.isSaving.set(true);
        const v = this.suggestionForm.getRawValue();
        this.service
            .programarSugerencia(pid, this.selectedDateIso(), {
                tipoActividadSugerida: v.tipoActividadSugerida || undefined,
                actividadDetalle: v.actividadDetalle || undefined,
                observacionesNutriologo: v.observacionesNutriologo || undefined,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.notificationService.success('Sugerencia guardada correctamente.');
                    this.isSaving.set(false);
                    this.historyResource.reload();
                },
                error: () => {
                    this.isSaving.set(false);
                },
            });
    }
}
