import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MedidaAntropometricaService } from '../../service/medida-antropometrica-service';
import { PacienteService } from '../../service/paciente-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { MedidaAntropometrica, MedidaAntropometricaRequest } from '../../interfaces/medida-antropometrica.interface';

interface ImcInfo {
  value: number;
  category: string;
  categoryColor: string;
  message: string;
  personScale: number;
  personColor: string;
  pointerLeft: number;
}

interface FatInfo {
  value: number;
  dash: string;
  category: string;
  categoryColor: string;
  message: string;
  strokeColor: string;
}

interface IccInfo {
  value: number;
  badge: string;
  badgeClass: string;
  message: string;
  pointerLeft: number;
}

interface IceInfo {
  value: number;
  badge: string;
  badgeClass: string;
  pointerLeft: number;
}

@Component({
  selector: 'app-medidas-antropometricas',
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialog],
  templateUrl: './medidas-antropometricas.html',
  styleUrl: './medidas-antropometricas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MedidasAntropometricas {

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly medidaService = inject(MedidaAntropometricaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pacienteId = signal<number>(
    Number(this.route.snapshot.paramMap.get('id'))
  );

  protected isSubmitting = signal(false);
  protected editingId = signal<number | null>(null);
  protected modoEdicion = computed(() => this.editingId() !== null);

  protected pacienteResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) => this.pacienteService.obtenerPacientePorId(params.id),
  });

  protected historialResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) => this.medidaService.obtenerHistorial(params.id),
  });

  protected nombreCompleto = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return '';
    return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
  });

  protected genero = computed(() => {
    const p = this.pacienteResource.value();
    return p?.genero ?? 'MASCULINO';
  });

  protected form = this.fb.nonNullable.group({
    peso: [null as unknown as number, [Validators.required, Validators.min(1), Validators.max(999)]],
    altura: [null as unknown as number, [Validators.required, Validators.min(1), Validators.max(999)]],
    cintura: [null as unknown as number, [Validators.min(1), Validators.max(999)]],
    cadera: [null as unknown as number, [Validators.min(1), Validators.max(999)]],
    cuello: [null as unknown as number, [Validators.min(1), Validators.max(999)]],
  });

  private formValues = signal<{
    peso: number; altura: number; cintura: number; cadera: number; cuello: number;
  }>({ peso: 0, altura: 0, cintura: 0, cadera: 0, cuello: 0 });

  protected imc = computed<ImcInfo | null>(() => {
    const { peso, altura } = this.formValues();
    if (!peso || !altura) return null;
    const alturaM = altura / 100;
    const imc = peso / (alturaM * alturaM);

    let category = '', categoryColor = '', message = '', personScale = 1, personColor = '#34d399';
    if (imc < 18.5) {
      category = 'Bajo Peso'; categoryColor = '#3b82f6'; message = 'Déficit ponderal. Requiere evaluación para alcanzar peso saludable.'; personScale = 0.8; personColor = '#60a5fa';
    } else if (imc < 25) {
      category = 'Normopeso'; categoryColor = '#10b981'; message = 'Relación peso-estatura dentro de los parámetros fisiológicos normales.'; personScale = 1; personColor = '#34d399';
    } else if (imc < 30) {
      category = 'Sobrepeso'; categoryColor = '#eab308'; message = 'Aumento de masa corporal. Riesgo moderado de comorbilidades.'; personScale = 1.35; personColor = '#facc15';
    } else {
      category = 'Obesidad'; categoryColor = '#f43f5e'; message = 'Riesgo cardiometabólico elevado. Requiere intervención nutricional.'; personScale = 1.7; personColor = '#fb7185';
    }
    const pointerLeft = Math.max(0, Math.min(100, ((imc - 15) / 25) * 100));
    return { value: imc, category, categoryColor, message, personScale, personColor, pointerLeft };
  });

  protected fat = computed<FatInfo | null>(() => {
    const { cintura, cuello, cadera, altura } = this.formValues();
    const gen = this.genero() === 'FEMENINO' ? 'F' : 'M';
    const valid = gen === 'M'
      ? cintura > 0 && cuello > 0 && altura > 0
      : cintura > 0 && cuello > 0 && cadera > 0 && altura > 0;
    if (!valid) return null;

    let fatPct = 0;
    try {
      if (gen === 'M') {
        fatPct = 495 / (1.0324 - 0.19077 * Math.log10(cintura - cuello) + 0.15456 * Math.log10(altura)) - 450;
      } else {
        fatPct = 495 / (1.29579 - 0.35004 * Math.log10(cintura + cadera - cuello) + 0.22100 * Math.log10(altura)) - 450;
      }
    } catch { fatPct = 0; }

    if (fatPct <= 0 || fatPct >= 100) return null;

    let category = '', categoryColor = '', message = 'Tejido adiposo en rango óptimo.', strokeColor = '#34d399';
    const ranges = gen === 'M' ? [6, 18, 25] : [14, 25, 32];
    if (fatPct < ranges[0]) { category = 'Esencial'; categoryColor = '#60a5fa'; strokeColor = '#60a5fa'; }
    else if (fatPct < ranges[1]) { category = 'Atlético'; categoryColor = '#10b981'; strokeColor = '#34d399'; }
    else if (fatPct < ranges[2]) { category = 'Aceptable'; categoryColor = '#eab308'; strokeColor = '#facc15'; }
    else { category = 'Obesidad'; categoryColor = '#f43f5e'; message = 'Exceso de tejido adiposo. Aumenta riesgo metabólico.'; strokeColor = '#fb7185'; }

    return { value: fatPct, dash: `${fatPct.toFixed(1)}, 100`, category, categoryColor, message, strokeColor };
  });

  protected icc = computed<IccInfo | null>(() => {
    const { cintura, cadera } = this.formValues();
    if (!cintura || !cadera) return null;
    const gen = this.genero() === 'FEMENINO' ? 'F' : 'M';
    const icc = cintura / cadera;
    const limit = gen === 'M' ? 0.95 : 0.80;
    const pointerLeft = Math.max(0, Math.min(100, ((icc - 0.65) / 0.5) * 100));

    const high = icc >= limit;
    return {
      value: icc,
      badge: high ? 'ALTO RIESGO' : 'BAJO RIESGO',
      badgeClass: high ? 'badge-danger' : 'badge-success',
      message: high
        ? 'Distribución tipo Androide. Alto riesgo de patología coronaria.'
        : 'Distribución tipo Ginoide. Menor riesgo cardiovascular.',
      pointerLeft,
    };
  });

  protected ice = computed<IceInfo | null>(() => {
    const { cintura, altura } = this.formValues();
    if (!cintura || !altura) return null;
    const ice = cintura / altura;
    const pointerLeft = Math.max(0, Math.min(100, ((ice - 0.35) / 0.3) * 100));
    const high = ice >= 0.5;
    return {
      value: ice,
      badge: high ? 'ALTO RIESGO' : 'SALUDABLE',
      badgeClass: high ? 'badge-danger' : 'badge-success',
      pointerLeft,
    };
  });

  constructor() {
    effect(() => {
      const pesoCtrl = this.form.get('peso')!.value;
      const alturaCtrl = this.form.get('altura')!.value;
      const cinturaCtrl = this.form.get('cintura')!.value;
      const caderaCtrl = this.form.get('cadera')!.value;
      const cuelloCtrl = this.form.get('cuello')!.value;
      // Track form value changes reactively by listening to form.valueChanges
      void pesoCtrl; void alturaCtrl; void cinturaCtrl; void caderaCtrl; void cuelloCtrl;
    });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const v = this.form.getRawValue();
      this.formValues.set({
        peso: Number(v.peso) || 0,
        altura: Number(v.altura) || 0,
        cintura: Number(v.cintura) || 0,
        cadera: Number(v.cadera) || 0,
        cuello: Number(v.cuello) || 0,
      });
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();
    const request: MedidaAntropometricaRequest = {
      peso: Number(raw.peso),
      altura: Number(raw.altura),
      ...(raw.cintura && { cintura: Number(raw.cintura) }),
      ...(raw.cadera && { cadera: Number(raw.cadera) }),
      ...(raw.cuello && { cuello: Number(raw.cuello) }),
    };

    const op$ = this.modoEdicion()
      ? this.medidaService.actualizarMedida(this.editingId()!, request)
      : this.medidaService.registrarMedida(this.pacienteId(), request);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const msg = this.modoEdicion() ? 'Medida actualizada correctamente' : 'Medida registrada correctamente';
        this.notificationService.success(msg);
        this.historialResource.reload();
        this.resetForm();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  protected editarMedida(medida: MedidaAntropometrica): void {
    this.editingId.set(medida.id);
    this.form.patchValue({
      peso: medida.peso,
      altura: medida.altura,
      cintura: medida.cintura ?? null as unknown as number,
      cadera: medida.cadera ?? null as unknown as number,
      cuello: medida.cuello ?? null as unknown as number,
    });
  }

  protected async eliminarMedida(medidaId: number): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar medida',
      '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;

    this.medidaService.eliminarMedida(medidaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Medida eliminada correctamente');
          this.historialResource.reload();
          if (this.editingId() === medidaId) this.resetForm();
        },
      });
  }

  protected cancelarEdicion(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset();
    this.formValues.set({ peso: 0, altura: 0, cintura: 0, cadera: 0, cuello: 0 });
  }

  protected formatearFecha(fecha: string): string {
    const d = new Date(fecha + 'T00:00:00');
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }
}
