import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlimentoService } from '../../../alimentos/service/alimento-service';
import { PlantillaService } from '../../service/plantilla-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Alimento, CATEGORIAS_ALIMENTO } from '../../../alimentos/interfaces/alimento.interface';
import { TIPOS_COMIDA, TipoComida } from '../../interfaces/plantilla.interface';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

interface ItemPlantilla {
  alimento: Alimento;
  cantidad: number;
}

@Component({
  selector: 'app-registro-plantilla',
  imports: [ReactiveFormsModule, RouterLink, Pagination, DecimalPipe],
  templateUrl: './registro-plantilla.html',
  styleUrl: './registro-plantilla.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroPlantilla {
  private readonly fb = inject(FormBuilder);
  private readonly alimentoService = inject(AlimentoService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly categorias = CATEGORIAS_ALIMENTO;
  protected readonly tiposComida = TIPOS_COMIDA;

  protected isSubmitting = signal(false);
  protected searchTerm = signal('');
  protected selectedCategory = signal('');
  protected items = signal<ItemPlantilla[]>([]);

  protected currentPage = signal(0);
  protected pageSize = signal(8);

  protected plantillaForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    tipoComida: ['DESAYUNO' as TipoComida, [Validators.required]],
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
    let calorias = 0,
      proteina = 0,
      carbohidratos = 0,
      grasas = 0;
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
    const barProteina = total > 0 ? (calPro / total) * 100 : 0;
    const barCarbohidratos = total > 0 ? (calCarb / total) * 100 : 0;
    const barGrasas = total > 0 ? (calFat / total) * 100 : 0;
    return {
      calorias: Math.round(calorias),
      proteina: proteina.toFixed(1),
      carbohidratos: carbohidratos.toFixed(1),
      grasas: grasas.toFixed(1),
      pctProteina: Math.round(barProteina),
      pctCarbohidratos: Math.round(barCarbohidratos),
      pctGrasas: Math.round(barGrasas),
      barProteina,
      barCarbohidratos,
      barGrasas,
    };
  });

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
  }

  protected onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedCategory.set(select.value);
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
    const control = this.plantillaForm.get(field);
    return !!(control && control.touched && control.errors);
  }

  protected onSubmit(): void {
    if (this.plantillaForm.invalid) {
      this.plantillaForm.markAllAsTouched();
      return;
    }
    if (this.items().length === 0) {
      this.notificationService.warning('Agrega al menos un alimento a la plantilla');
      return;
    }

    this.isSubmitting.set(true);
    const { nombre, tipoComida } = this.plantillaForm.getRawValue();

    const alimentos = this.items().map((item) => ({
      alimentoId: item.alimento.id!,
      cantidad: item.cantidad,
    }));

    this.plantillaService
      .crearPlantilla({ nombre, tipoComida, alimentos })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('¡Plantilla creada exitosamente!');
          this.router.navigate(['/main/plantillas']);
        },
        error: () => {
          this.isSubmitting.set(false);
        },
      });
  }
}
