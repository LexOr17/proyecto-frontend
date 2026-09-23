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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { of, startWith } from 'rxjs';
import { DiarioExtendidoService } from '../../service/diario-extendido-service';
import { AuthService } from '../../../../core/services/auth-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';
import {
    BebidaConsumida,
    CalidadSueno,
    EstadoAnimo,
    Sintoma,
    DiarioExtendidoResponse,
    ESTADO_ANIMO_MAP,
    CALIDAD_SUENO_MAP,
    SINTOMA_LABEL,
    TIPO_ACTIVIDAD_LABEL,
} from '../../interfaces/diario-extendido.interface';

@Component({
    selector: 'app-diario-extendido-paciente',
    imports: [ReactiveFormsModule, Pagination],
    templateUrl: './diario-extendido-paciente.html',
    styleUrl: './diario-extendido-paciente.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiarioExtendidoPaciente {
    private readonly fb = inject(FormBuilder);
    private readonly service = inject(DiarioExtendidoService);
    private readonly authService = inject(AuthService);
    private readonly notificationService = inject(NotificationService);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly userName = this.authService.userName;
    protected readonly isSaving = signal(false);
    protected readonly bebidas = signal<BebidaConsumida[]>([]);
    protected readonly sugerenciaData = signal<DiarioExtendidoResponse | null>(null);
    protected readonly selectedDay = signal<'hoy' | 'ayer'>('hoy');
    protected readonly isEditing = signal(false);
    private readonly pendingEditDate = signal<string | null>(null);
    protected readonly historialPage = signal(0);
    protected readonly historialSize = 5;

    protected readonly ESTADO_ANIMO_MAP = ESTADO_ANIMO_MAP;
    protected readonly CALIDAD_SUENO_MAP = CALIDAD_SUENO_MAP;
    protected readonly SINTOMA_LABEL = SINTOMA_LABEL;
    protected readonly TIPO_ACTIVIDAD_LABEL = TIPO_ACTIVIDAD_LABEL;
    protected readonly estadosAnimo = Object.keys(ESTADO_ANIMO_MAP) as EstadoAnimo[];
    protected readonly sintomasOptions = Object.entries(SINTOMA_LABEL) as [Sintoma, string][];
    protected readonly calidadesOptions = Object.entries(CALIDAD_SUENO_MAP) as [CalidadSueno, { label: string; horas: number }][];

    protected readonly selectedDateISO = computed(() =>
        this.localDateISO(
            this.selectedDay() === 'ayer' ? new Date(Date.now() - 86400000) : new Date(),
        ),
    );

    protected readonly selectedDateFormatted = computed(() => {
        const d = this.selectedDay() === 'ayer' ? new Date(Date.now() - 86400000) : new Date();
        return d
            .toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
            .toUpperCase();
    });

    /** Locked if "ayer" was selected and the 12-hour grace window has passed (past noon). */
    protected readonly isLocked = computed(
        () => this.selectedDay() === 'ayer' && new Date().getHours() >= 12,
    );

    protected readonly diaryResource = rxResource({
        params: () => this.selectedDateISO(),
        stream: ({ params: fecha }) => this.service.obtenerMiDiarioPorFecha(fecha),
    });

    protected readonly historyResource = rxResource({
        params: () => ({ pacienteId: this.authService.userId(), page: this.historialPage() }),
        stream: ({ params }) => {
            if (!params.pacienteId) return of(null);
            return this.service.listarHistorialPaciente(params.pacienteId, params.page, this.historialSize);
        },
    });

    protected readonly isLoading = computed(() => this.diaryResource.isLoading());

    protected readonly diarioExiste = computed(() => !!this.diaryResource.value()?.estadoAnimo);

    protected readonly diarioActual = computed(() => this.diaryResource.value() ?? null);

    protected readonly selectedDateFormattedLC = computed(() => {
        const d = this.selectedDay() === 'ayer' ? new Date(Date.now() - 86400000) : new Date();
        return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    });

    // ─── Formulario sin valores preseleccionados automáticos ──────────────
    protected readonly form = this.fb.group({
        estadoAnimo: this.fb.control<EstadoAnimo | null>(null, {
            validators: Validators.required,
        }),
        calidadSueno: this.fb.control<CalidadSueno | null>(null, {
            validators: Validators.required,
        }),
        sintomaPrincipal: this.fb.control<Sintoma | null>(null, {
            validators: Validators.required,
        }),
        sintomaDetalle: this.fb.control('', { nonNullable: true }),
        actividadRealizada: this.fb.control<boolean | null>(null),
        bebidasNombre: this.fb.control('', { nonNullable: true }),
        bebidasCantidad: this.fb.control<number | null>(null),
    });

    private readonly sintomaPrincipalChanges = toSignal(
        this.form.controls.sintomaPrincipal.valueChanges.pipe(
            startWith(this.form.controls.sintomaPrincipal.value),
        ),
        { initialValue: null as Sintoma | null },
    );

    protected readonly showSintomaDetalle = computed(
        () => this.sintomaPrincipalChanges() === 'OTRO',
    );

    protected readonly sugerenciaTexto = computed(() => {
        const d = this.sugerenciaData();
        if (!d?.tipoActividadSugerida || d.tipoActividadSugerida === 'NINGUNA') return null;
        const label = TIPO_ACTIVIDAD_LABEL[d.tipoActividadSugerida];
        return d.actividadDetalle ? `${label}: ${d.actividadDetalle}` : label;
    });

    private readonly formValues = toSignal(
        this.form.valueChanges.pipe(
            startWith(this.form.getRawValue()),
        ),
        { initialValue: this.form.getRawValue() },
    );

    protected readonly isFormIncomplete = computed(() => {
        const v = this.formValues();
        if (!v?.estadoAnimo || !v?.calidadSueno || !v?.sintomaPrincipal) return true;
        if (v.sintomaPrincipal === 'OTRO' && !v.sintomaDetalle?.trim()) return true;
        if (this.sugerenciaTexto() && (v.actividadRealizada === null || v.actividadRealizada === undefined)) return true;
        return false;
    });

    constructor() {
        effect(() => {
            if (this.diaryResource.isLoading()) return;
            const diario = this.diaryResource.value();
            const currentDate = this.selectedDateISO();

            const pending = untracked(() => this.pendingEditDate());
            if (pending && pending === currentDate) {
                untracked(() => {
                    this.pendingEditDate.set(null);
                    this.isEditing.set(true);
                });
            } else {
                untracked(() => this.isEditing.set(false));
            }

            if (diario) {
                const prev = untracked(() => this.sugerenciaData());
                if (!diario.tipoActividadSugerida && prev?.tipoActividadSugerida) {
                    this.sugerenciaData.set({
                        ...diario,
                        tipoActividadSugerida: prev.tipoActividadSugerida,
                        actividadDetalle: prev.actividadDetalle,
                        observacionesNutriologo: prev.observacionesNutriologo,
                    });
                } else {
                    this.sugerenciaData.set(diario);
                }
            } else {
                this.sugerenciaData.set(null);
            }

            if (diario?.estadoAnimo) {
                this.populateForm(diario);
            } else {
                this.resetForm();
            }
        });
    }

    private localDateISO(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    protected selectDay(day: 'hoy' | 'ayer'): void {
        if (this.isSaving()) return;
        this.selectedDay.set(day);
    }

    protected canEditHistoryEntry(fecha: string): boolean {
        const now = new Date();
        const today = this.localDateISO(now);
        const yesterday = this.localDateISO(new Date(now.getTime() - 86400000));
        if (fecha === today) return true;
        if (fecha === yesterday) return now.getHours() < 12;
        return false;
    }

    protected triggerEdit(fecha: string): void {
        if (this.isSaving()) return;
        const now = new Date();
        const today = this.localDateISO(now);
        const yesterday = this.localDateISO(new Date(now.getTime() - 86400000));
        const targetDay: 'hoy' | 'ayer' | null =
            fecha === today ? 'hoy' : fecha === yesterday ? 'ayer' : null;
        if (!targetDay) return;
        if (this.selectedDay() === targetDay) {
            this.isEditing.set(true);
        } else {
            this.pendingEditDate.set(fecha);
            this.selectedDay.set(targetDay);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    protected cancelEditing(): void {
        this.isEditing.set(false);
        const diario = this.diaryResource.value();
        if (diario) this.populateForm(diario);
    }

    protected onHistorialPageChange(event: PageEvent): void {
        this.historialPage.set(event.page);
    }

    protected formatHistoryDate(isoDate: string): string {
        const [y, m, d] = isoDate.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    private populateForm(diario: DiarioExtendidoResponse): void {
        this.form.patchValue({
            estadoAnimo: diario.estadoAnimo ?? null,
            calidadSueno: diario.calidadSueno ?? null,
            sintomaPrincipal: diario.sintomaPrincipal ?? null,
            sintomaDetalle: diario.sintomaDetalle ?? '',
            actividadRealizada: diario.actividadRealizada ?? null,
        });
        this.bebidas.set(diario.bebidas ?? []);
    }

    private resetForm(): void {
        this.form.reset({
            estadoAnimo: null,
            calidadSueno: null,
            sintomaPrincipal: null,
            sintomaDetalle: '',
            actividadRealizada: null,
            bebidasNombre: '',
            bebidasCantidad: null,
        });
        this.bebidas.set([]);
    }

    // ─── Setters interactivos ─────────────────────────────────────────────
    protected setAnimo(mood: EstadoAnimo): void {
        this.form.controls.estadoAnimo.setValue(mood);
        this.form.controls.estadoAnimo.markAsTouched();
    }

    protected setSueno(sueno: CalidadSueno): void {
        this.form.controls.calidadSueno.setValue(sueno);
        this.form.controls.calidadSueno.markAsTouched();
    }

    protected setActividad(realizada: boolean): void {
        this.form.controls.actividadRealizada.setValue(realizada);
        this.form.controls.actividadRealizada.markAsTouched();
    }

    protected onSintomaChange(event: Event): void {
        const val = (event.target as HTMLSelectElement).value as Sintoma;
        this.form.controls.sintomaPrincipal.setValue(val || null);
        this.form.controls.sintomaPrincipal.markAsTouched();
        const detalleCtrl = this.form.controls.sintomaDetalle;
        if (val === 'OTRO') {
            detalleCtrl.setValidators([Validators.required, Validators.maxLength(255)]);
        } else {
            detalleCtrl.clearValidators();
            detalleCtrl.setValue('');
        }
        detalleCtrl.updateValueAndValidity();
    }

    protected addBebida(): void {
        const nombre = this.form.controls.bebidasNombre.value.trim();
        const cantidad = this.form.controls.bebidasCantidad.value;
        if (!nombre || !cantidad || cantidad <= 0) return;
        this.bebidas.update(list => [...list, { nombre, cantidad }]);
        this.form.controls.bebidasNombre.setValue('');
        this.form.controls.bebidasCantidad.setValue(null);
    }

    protected quickAddBebida(nombre: string, cantidad: number): void {
        this.bebidas.update(list => [...list, { nombre, cantidad }]);
    }

    protected removeBebida(index: number): void {
        this.bebidas.update(list => list.filter((_, i) => i !== index));
    }

    protected onSubmit(): void {
        this.form.markAllAsTouched();
        
        if (this.isLocked()) {
            this.notificationService.warning('El plazo de registro para este día ha vencido.');
            return;
        }

        const v = this.form.getRawValue();

        if (!v.estadoAnimo) {
            this.notificationService.warning('Por favor, selecciona cómo te sientes hoy (estado de ánimo).');
            return;
        }
        if (!v.calidadSueno) {
            this.notificationService.warning('Por favor, indica tu calidad de descanso.');
            return;
        }
        if (!v.sintomaPrincipal) {
            this.notificationService.warning('Por favor, selecciona un síntoma o indica "Ninguno".');
            return;
        }
        if (v.sintomaPrincipal === 'OTRO' && !v.sintomaDetalle?.trim()) {
            this.notificationService.warning('Por favor, especifica el detalle de tu síntoma.');
            return;
        }
        if (this.sugerenciaTexto() && v.actividadRealizada === null) {
            this.notificationService.warning('Por favor, indica si realizaste la actividad física sugerida.');
            return;
        }

        this.isSaving.set(true);
        this.service
            .registrarDiario({
                fecha: this.selectedDateISO(),
                estadoAnimo: v.estadoAnimo,
                calidadSueno: v.calidadSueno,
                sintomaPrincipal: v.sintomaPrincipal,
                sintomaDetalle: v.sintomaDetalle?.trim() || undefined,
                actividadRealizada: v.actividadRealizada ?? undefined,
                bebidas: this.bebidas(),
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.diaryResource.reload();
                    this.historyResource.reload();
                    this.isEditing.set(false);
                    this.notificationService.success('¡Registro de bienestar guardado correctamente!');
                    this.isSaving.set(false);
                },
                error: () => {
                    this.isSaving.set(false);
                },
            });
    }
}

