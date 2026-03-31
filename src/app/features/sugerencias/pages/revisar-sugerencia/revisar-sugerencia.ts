import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { SugerenciaService } from '../../service/sugerencia-service';
import { PlantillaService } from '../../../plantillas/service/plantilla-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { TIPOS_COMIDA } from '../../../plantillas/interfaces/plantilla.interface';
import { ESTADOS_SUGERENCIA } from '../../interfaces/sugerencia.interface';

@Component({
  selector: 'app-revisar-sugerencia',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, SlicePipe],
  templateUrl: './revisar-sugerencia.html',
  styleUrl: './revisar-sugerencia.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevisarSugerencia {
  private readonly sugerenciaService = inject(SugerenciaService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly notificationService = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tiposComida = TIPOS_COMIDA;
  protected readonly estadosSugerencia = ESTADOS_SUGERENCIA;

  protected isSubmitting = signal(false);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  protected sugerenciaResource = rxResource({
    params: () => ({ id: this.id }),
    stream: ({ params }) => this.sugerenciaService.obtenerPorId(params.id),
  });

  protected sugerencia = computed(() => this.sugerenciaResource.value());

  protected plantillaOriginalResource = rxResource({
    params: () => ({ id: this.sugerencia()?.plantillaOriginalId ?? null }),
    stream: ({ params }) =>
      params.id != null ? this.plantillaService.obtenerPlantillaPorId(params.id) : of(null),
  });

  protected plantillaOriginal = computed(() => this.plantillaOriginalResource.value());

  protected revisionForm = this.fb.nonNullable.group({
    estado: ['APROBADA' as 'APROBADA' | 'RECHAZADA', [Validators.required]],
    comentarioNutriologo: ['', [Validators.maxLength(500)]],
  });

  protected obtenerIconTipo(tipo: string): string {
    return this.tiposComida.find((t) => t.value === tipo)?.icon ?? '';
  }

  protected obtenerLabelTipo(tipo: string): string {
    return this.tiposComida.find((t) => t.value === tipo)?.label ?? tipo;
  }

  protected obtenerEstado(estado: string) {
    return this.estadosSugerencia.find((e) => e.value === estado);
  }

  protected onSubmit(): void {
    if (this.revisionForm.invalid) {
      this.revisionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const { estado, comentarioNutriologo } = this.revisionForm.getRawValue();

    this.sugerenciaService
      .revisarSugerencia(this.id, {
        estado,
        comentarioNutriologo: comentarioNutriologo || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const msg =
            estado === 'APROBADA'
              ? '¡Sugerencia aprobada exitosamente!'
              : 'Sugerencia rechazada.';
          this.notificationService.success(msg);
          this.router.navigate(['/main/sugerencias']);
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }
}
