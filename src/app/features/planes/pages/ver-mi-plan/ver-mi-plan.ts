import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { PlanAlimenticioService } from '../../service/plan-service';
import { PlantillaService } from '../../../plantillas/service/plantilla-service';
import { AuthService } from '../../../../core/services/auth-service';
import { TIPOS_COMIDA, TipoComida, Plantilla } from '../../../plantillas/interfaces/plantilla.interface';

@Component({
  selector: 'app-ver-mi-plan',
  imports: [],
  templateUrl: './ver-mi-plan.html',
  styleUrl: './ver-mi-plan.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerMiPlan {
  private readonly planService = inject(PlanAlimenticioService);
  private readonly plantillaService = inject(PlantillaService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly userName = this.authService.userName;
  protected readonly userInitials = this.authService.userInitials;

  // ─── Plan resource ────────────────────────────────────────────────────
  private readonly planId = Number(this.route.snapshot.paramMap.get('id'));

  protected readonly planResource = rxResource({
    stream: () =>
      this.planService.obtenerPlanPorId(this.planId).pipe(map(r => r.datos!)),
  });

  // ─── Plantilla details (for descriptions + kcal) ─────────────────────
  protected readonly plantillasMap = signal<Map<number, Plantilla>>(new Map());

  // ─── Day selector ─────────────────────────────────────────────────────
  protected readonly diaSeleccionado = signal(1);

  protected readonly diasPlan = computed(() => {
    const plan = this.planResource.value();
    if (!plan) return [];
    const [y, m, d] = plan.fechaInicio.split('-').map(Number);
    return Array.from({ length: plan.duracionDias }, (_, i) => {
      const date = new Date(y, m - 1, d + i);
      return {
        dia: i + 1,
        diaSemana: date
          .toLocaleDateString('es-ES', { weekday: 'short' })
          .substring(0, 3),
        numeroDia: date.getDate(),
      };
    });
  });

  protected readonly fechaDiaActual = computed(() => {
    const plan = this.planResource.value();
    const dia = this.diaSeleccionado();
    if (!plan) return '';
    const [y, m, d] = plan.fechaInicio.split('-').map(Number);
    const date = new Date(y, m - 1, d + dia - 1);
    const str = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  protected readonly comidasDelDia = computed(() => {
    const plan = this.planResource.value();
    const dia = this.diaSeleccionado();
    if (!plan) return [];
    const orden: TipoComida[] = ['DESAYUNO', 'ALMUERZO', 'MERIENDA', 'CENA'];
    return plan.comidasProgramadas
      .filter(c => c.diaPlan === dia)
      .sort((a, b) => orden.indexOf(a.horario) - orden.indexOf(b.horario));
  });

  // ─── Meal type display config ─────────────────────────────────────────
  protected readonly MEAL_CONFIG: Record<TipoComida, { label: string; emoji: string }> = {
    DESAYUNO: { label: 'Desayuno', emoji: '🌅' },
    ALMUERZO: { label: 'Almuerzo', emoji: '🍲' },
    MERIENDA: { label: 'Merienda', emoji: '🍎' },
    CENA: { label: 'Cena', emoji: '🌙' },
  };

  constructor() {
    // When plan loads: set initial day to today's position in the plan, then fetch plantillas
    effect(() => {
      const plan = this.planResource.value();
      if (!plan) return;

      untracked(() => {
        // Determine today's day in the plan
        const [y, m, d] = plan.fechaInicio.split('-').map(Number);
        const inicio = new Date(y, m - 1, d);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const diffDias =
          Math.floor((hoy.getTime() - inicio.getTime()) / 86_400_000) + 1;
        this.diaSeleccionado.set(
          Math.max(1, Math.min(diffDias, plan.duracionDias)),
        );

        // Fetch unique plantilla details
        const uniqueIds = [
          ...new Set(plan.comidasProgramadas.map(c => c.plantillaId)),
        ];
        if (uniqueIds.length === 0) return;

        forkJoin(uniqueIds.map(id => this.plantillaService.obtenerPlantillaPorId(id)))
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(plantillas => {
            const mapa = new Map<number, Plantilla>();
            plantillas.forEach((p, i) => {
              if (p) mapa.set(uniqueIds[i], p);
            });
            this.plantillasMap.set(mapa);
          });
      });
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────
  protected getKcal(plantillaId: number): number {
    const p = this.plantillasMap().get(plantillaId);
    return p ? p.alimentos.reduce((sum, a) => sum + a.calorias, 0) : 0;
  }

  protected getImagenPrincipal(plantillaId: number): string | null {
    const p = this.plantillasMap().get(plantillaId);
    return p?.alimentos.find(a => !!a.imagenUrl)?.imagenUrl ?? null;
  }

  protected getCantidadImagenes(plantillaId: number): number {
    const p = this.plantillasMap().get(plantillaId);
    return p?.alimentos.filter(a => !!a.imagenUrl).length ?? 0;
  }

  protected getDescripcion(plantillaId: number): string {
    const p = this.plantillasMap().get(plantillaId);
    if (!p || p.alimentos.length === 0) return '';
    return p.alimentos
      .map(a => `${a.nombre} (${a.porcionBase}\u00a0${a.unidadPorcion})`)
      .join(' · ');
  }

  protected seleccionarDia(dia: number): void {
    this.diaSeleccionado.set(dia);
  }

  protected volver(): void {
    this.router.navigate(['/main/mis-planes']);
  }
}
