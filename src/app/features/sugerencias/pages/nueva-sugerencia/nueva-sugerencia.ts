import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { AlimentoService } from '../../../alimentos/service/alimento-service';
import { SugerenciaService } from '../../service/sugerencia-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Alimento, CATEGORIAS_ALIMENTO } from '../../../alimentos/interfaces/alimento.interface';
import { Plantilla, TIPOS_COMIDA, TipoComida } from '../../../plantillas/interfaces/plantilla.interface';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

interface ItemSugerencia {
  alimento: Alimento;
  cantidad: number;
}

@Component({
  selector: 'app-nueva-sugerencia',
  imports: [ReactiveFormsModule, RouterLink, Pagination],
  templateUrl: './nueva-sugerencia.html',
  styleUrl: './nueva-sugerencia.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevaSugerencia {
  private readonly fb = inject(FormBuilder);
  private readonly alimentoService = inject(AlimentoService);
  private readonly sugerenciaService = inject(SugerenciaService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categorias = CATEGORIAS_ALIMENTO;
  protected readonly tiposComida = TIPOS_COMIDA;

  protected isSubmitting = signal(false);
  protected searchTerm = signal('');
  protected selectedCategory = signal('');
  protected items = signal<ItemSugerencia[]>([]);

  protected currentPage = signal(0);
  protected pageSize = signal(8);

  protected mostrarPickerPlan = signal(false);
  protected plantillaSeleccionada = signal<Plantilla | null>(null);

  protected planPlantillasResource = rxResource({
    stream: () =>
      this.sugerenciaService.obtenerPlantillasDelPlanActual().pipe(catchError(() => of([]))),
  });

  protected sugerenciaForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    tipoComida: ['DESAYUNO' as TipoComida, [Validators.required]],
    motivoSugerencia: ['', [Validators.maxLength(500)]],
  });

  protected alimentosResource = rxResource({
    params: () => ({ page: this.currentPage(), size: this.pageSize() }),
    stream: ({ params }) =>
      this.alimentoService.obtenerAlimentos(params.page, params.size),
  });

  protected alimentosFiltrados = computed(() => {
    const alimentos = this.alimentosResource.value()?.content ?? [];
    const term = this.searchTerm().toLowerCase();
    const cat = this.selectedCategory();
    return alimentos.filter((a) => {
      const matchText = !term || a.nombre.toLowerCase().includes(term);
      const matchCat = !cat || a.categoria === cat;
      return matchText && matchCat;
    });
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
  }

  protected onCategoryChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
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
      const newCantidad = updated[index].cantidad + delta;
      if (newCantidad <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...updated[index], cantidad: newCantidad };
      }
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
    const { nombre, tipoComida, motivoSugerencia } = this.sugerenciaForm.getRawValue();

    this.sugerenciaService
      .enviarSugerencia({
        nombre,
        tipoComida,
        motivoSugerencia: motivoSugerencia || undefined,
        plantillaOriginalId: this.plantillaSeleccionada()?.id,
        alimentos: this.items().map((i) => ({ alimentoId: i.alimento.id!, cantidad: i.cantidad })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('¡Sugerencia enviada al nutriólogo exitosamente!');
          this.router.navigate(['/main/mis-sugerencias']);
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }
}
