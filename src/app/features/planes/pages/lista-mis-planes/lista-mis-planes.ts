import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PlanAlimenticioService } from '../../service/plan-service';
import { AuthService } from '../../../../core/services/auth-service';
import { PlanAlimenticioResponse } from '../../interfaces/plan.interface';

@Component({
  selector: 'app-lista-mis-planes',
  imports: [],
  templateUrl: './lista-mis-planes.html',
  styleUrl: './lista-mis-planes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaMisPlanes {
  private readonly planService = inject(PlanAlimenticioService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly userName = this.authService.userName;
  protected readonly userInitials = this.authService.userInitials;

  protected readonly planesResource = rxResource({
    params: () => ({ pacienteId: this.authService.userId()! }),
    stream: ({ params }) =>
      this.planService
        .obtenerPlanesDePaciente(params.pacienteId)
        .pipe(map(r => r.datos ?? [])),
  });

  protected readonly planesOrdenados = computed(() => {
    const planes = this.planesResource.value() ?? [];
    return [...planes].sort(
      (a, b) =>
        new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime(),
    );
  });

  protected verPlan(plan: PlanAlimenticioResponse): void {
    this.router.navigate(['/main/mis-planes', plan.id]);
  }

  protected calcularProgreso(plan: PlanAlimenticioResponse): { diaActual: number; porcentaje: number } {
    const [y, m, d] = plan.fechaInicio.split('-').map(Number);
    const inicio = new Date(y, m - 1, d);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((hoy.getTime() - inicio.getTime()) / 86_400_000) + 1;
    const diaActual = Math.max(1, Math.min(diffDias, plan.duracionDias));
    return { diaActual, porcentaje: Math.round((diaActual / plan.duracionDias) * 100) };
  }

  protected formatearFecha(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected esPlanActivo(plan: PlanAlimenticioResponse): boolean {
    const [y, m, d] = plan.fechaInicio.split('-').map(Number);
    const inicio = new Date(y, m - 1, d);
    const fin = new Date(y, m - 1, d + plan.duracionDias - 1);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy >= inicio && hoy <= fin;
  }
}
