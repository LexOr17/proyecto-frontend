import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, filter, forkJoin, map, of, switchMap } from 'rxjs';
import { AlimentoService } from '../../../alimentos/service/alimento-service';
import { SugerenciaService } from '../../service/sugerencia-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Alimento, CATEGORIAS_ALIMENTO } from '../../../alimentos/interfaces/alimento.interface';
import { Plantilla, TIPOS_COMIDA, TipoComida } from '../../../plantillas/interfaces/plantilla.interface';
import {
  CATEGORIAS_MOTIVO_SUGERENCIA,
  CategoriaMotivoSugerencia,
} from '../../interfaces/sugerencia.interface';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

interface ItemSugerencia {
  alimento: Alimento;
  cantidad: number;
}

@Component({
  selector: 'app-editar-sugerencia',
  imports: [ReactiveFormsModule, RouterLink, Pagination, DecimalPipe],
  templateUrl: './editar-sugerencia.html',
  styleUrl: '../nueva-sugerencia/nueva-sugerencia.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarSugerencia {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly alimentoService = inject(AlimentoService);
  private readonly sugerenciaService = inject(SugerenciaService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly sugerenciaId = +this.route.snapshot.params['id'];

  protected readonly categorias = CATEGORIAS_ALIMENTO;
  protected readonly tiposComida = TIPOS_COMIDA;
  protected readonly categoriasMotivo = CATEGORIAS_MOTIVO_SUGERENCIA;

  protected isSubmitting = signal(false);
  protected searchTerm = signal('');
  protected selectedCategory = signal('');
  protected items = signal<ItemSugerencia[]>([]);
  protected originalPlantillaId = signal<number | null>(null);

  protected currentPage = signal(0);
  protected pageSize = signal(8);

  protected mostrarPickerPlan = signal(false);
  protected plantillaSeleccionada = signal<Plantilla | null>(null);

  protected sugerenciaForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    tipoComida: ['DESAYUNO' as TipoComida, [Validators.required]],
    categoriaMotivo: ['PREFERENCIA_SABOR' as CategoriaMotivoSugerencia, [Validators.required]],
    motivoSugerencia: ['', [Validators.maxLength(500)]],
  });

  // Load the existing suggestion + full Alimento objects for each food in parallel
  protected initResource = rxResource({
    stream: () =>
      this.sugerenciaService.obtenerPorId(this.sugerenciaId).pipe(
        filter(Boolean),
        switchMap((sugerencia) => {
          if (sugerencia.detalles.length === 0) {
            return of({ sugerencia, alimentos: [] as (Alimento | null)[] });
          }
          return forkJoin(
            sugerencia.detalles.map((d) =>
              this.alimentoService.obtenerAlimentoPorId(d.alimentoId)
            )
          ).pipe(map((alimentos) => ({ sugerencia, alimentos })));
        })
      ),
  });

  protected planPlantillasResource = rxResource({
    stream: () =>
      this.sugerenciaService.obtenerPlantillasDelPlanActual().pipe(catchError(() => of([]))),
  });

  protected alimentosResource = rxResource({
    params: () => ({
      keyword: this.searchTerm(),
      page: this.currentPage(),
      size: this.pageSize(),
    }),
    stream: ({ params }) => {
      const kw = params.keyword.trim();
      if (kw) {
        return this.alimentoService.buscarAlimentos(kw, params.page, params.size);
      }
      return this.alimentoService.obtenerAlimentos(params.page, params.size);
    },
  });

  protected alimentosFiltrados = computed(() => {
    const alimentos = this.alimentosResource.value()?.content ?? [];
    const cat = this.selectedCategory();
    if (!cat) return alimentos;
    return alimentos.filter((a) => a.categoria === cat);
  });

  protected totales = computed(() => {
    let calorias = 0, proteina = 0, carbohidratos = 0, grasas = 0;
    for (const item of this.items()) {
      calorias += item.alimento.calorias * item.cantidad;
      proteina += item.alimento.proteina * item.cantidad;
      carbohidratos += item.alimento.carbohidratos * item.cantidad;
      grasas += item.alimento.grasas * item.cantidad;
    }
    const calPro = proteina * 4;
    const calCarb = carbohidratos * 4;
    const calFat = grasas * 9;
    const total = calPro + calCarb + calFat;
    return {
      calorias: Math.round(calorias),
      proteina: proteina.toFixed(1),
      carbohidratos: carbohidratos.toFixed(1),
      grasas: grasas.toFixed(1),
      barProteina: total > 0 ? (calPro / total) * 100 : 0,
      barCarbohidratos: total > 0 ? (calCarb / total) * 100 : 0,
      barGrasas: total > 0 ? (calFat / total) * 100 : 0,
    };
  });

  constructor() {
    // Pre-fill form and food items once the suggestion data resolves
    effect(() => {
      const data = this.initResource.value();
      if (!data) return;
      const { sugerencia, alimentos } = data;

      this.sugerenciaForm.patchValue({
        nombre: sugerencia.nombre,
        tipoComida: sugerencia.tipoComida,
        categoriaMotivo: sugerencia.categoriaMotivo ?? 'PREFERENCIA_SABOR',
        motivoSugerencia: sugerencia.motivoSugerencia ?? '',
      });

      this.originalPlantillaId.set(sugerencia.plantillaOriginalId);

      const items: ItemSugerencia[] = sugerencia.detalles
        .map((d, i) => {
          const a = alimentos[i];
          return a ? { alimento: a, cantidad: d.cantidad } : null;
        })
        .filter((item): item is ItemSugerencia => item !== null);

      this.items.set(items);
    });
  }

  protected usarPlantillaComoBase(plantilla: Plantilla): void {
    this.plantillaSeleccionada.set(plantilla);
    this.mostrarPickerPlan.set(false);
    this.sugerenciaForm.patchValue({
      nombre: plantilla.nombre,
      tipoComida: plantilla.tipoComida,
    });
  }

  protected limpiarPlantillaBase(): void {
    this.plantillaSeleccionada.set(null);
  }

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
  }

  protected onSearchChange(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(0);
  }

  protected onCategoryChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
  }

  protected setTipoComida(tipo: TipoComida): void {
    this.sugerenciaForm.controls.tipoComida.setValue(tipo);
  }

  protected setCategoriaMotivo(categoria: CategoriaMotivoSugerencia): void {
    this.sugerenciaForm.controls.categoriaMotivo.setValue(categoria);
  }

  protected limpiarBusqueda(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('');
    this.currentPage.set(0);
  }

  protected agregarAlimento(alimento: Alimento): void {
    this.items.update((current) => {
      const idx = current.findIndex((i) => i.alimento.id === alimento.id);
      if (idx > -1) {
        const updated = [...current];
        updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + 1 };
        return updated;
      }
      return [...current, { alimento, cantidad: 1 }];
    });
  }

  protected actualizarCantidad(index: number, delta: number): void {
    this.items.update((current) => {
      const updated = [...current];
      const newCantidad = Math.round((updated[index].cantidad + delta) * 100) / 100;
      if (newCantidad <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...updated[index], cantidad: newCantidad };
      }
      return updated;
    });
  }

  protected cambiarCantidadDirecta(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    if (isNaN(val) || val <= 0) {
      this.quitarAlimento(index);
      return;
    }
    this.items.update((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], cantidad: Math.round(val * 100) / 100 };
      return updated;
    });
  }

  protected quitarAlimento(index: number): void {
    this.items.update((current) => current.filter((_, i) => i !== index));
  }

  protected isFieldInvalid(field: string): boolean {
    const control = this.sugerenciaForm.get(field);
    return !!(control && control.touched && control.errors);
  }

  protected onSubmit(): void {
    if (this.sugerenciaForm.invalid) {
      this.sugerenciaForm.markAllAsTouched();
      return;
    }
    if (this.items().length === 0) {
      this.notificationService.warning('Agrega al menos un alimento a tu sugerencia');
      return;
    }

    this.isSubmitting.set(true);
    const { nombre, tipoComida, categoriaMotivo, motivoSugerencia } = this.sugerenciaForm.getRawValue();
    const plantillaOriginalId =
      this.plantillaSeleccionada()?.id ?? this.originalPlantillaId() ?? undefined;

    this.sugerenciaService
      .actualizarSugerencia(this.sugerenciaId, {
        nombre,
        tipoComida,
        categoriaMotivo,
        motivoSugerencia: motivoSugerencia || undefined,
        plantillaOriginalId,
        alimentos: this.items().map((i) => ({ alimentoId: i.alimento.id!, cantidad: i.cantidad })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Sugerencia actualizada correctamente');
          this.router.navigate(['/main/mis-sugerencias']);
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }
}
