import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { SeguimientoService } from '../../../pacientes/service/seguimiento-service';
import { SeguimientoConsulta } from '../../../pacientes/interfaces/seguimiento.interface';

@Component({
  selector: 'app-mi-seguimiento',
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './mi-seguimiento.html',
  styleUrl: './mi-seguimiento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiSeguimiento {
  private readonly seguimientoService = inject(SeguimientoService);

  protected readonly seguimientosResource = rxResource({
    stream: () => this.seguimientoService.misSeguimientos(0, 50),
  });

  protected readonly seleccionado = signal<SeguimientoConsulta | null>(null);

  protected getAdherenciaBadge(pctAlimentos: number, pctActividad: number): { label: string; cssClass: string; icon: string; score: number } {
    const score = Math.round((pctAlimentos * 0.6) + (pctActividad * 0.4));
    if (score >= 85) {
      return { label: 'Adherencia Excelente', cssClass: 'badge-excelente', icon: 'bx-star', score };
    }
    if (score >= 70) {
      return { label: 'Buen Progreso', cssClass: 'badge-bueno', icon: 'bx-check-circle', score };
    }
    if (score >= 50) {
      return { label: 'Progreso Regular', cssClass: 'badge-regular', icon: 'bx-error-circle', score };
    }
    return { label: 'Requiere Atención', cssClass: 'badge-critico', icon: 'bx-error', score };
  }

  protected verDetalle(item: SeguimientoConsulta): void {
    this.seleccionado.set(this.seleccionado()?.id === item.id ? null : item);
  }
}

