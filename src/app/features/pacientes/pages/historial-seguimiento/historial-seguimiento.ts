import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SeguimientoService } from '../../service/seguimiento-service';
import { PacienteService } from '../../service/paciente-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { AuthService } from '../../../../core/services/auth-service';
import { UserRole } from '../../../../core/interfaces/auth-response';
import { SeguimientoConsulta } from '../../interfaces/seguimiento.interface';

@Component({
  selector: 'app-historial-seguimiento',
  imports: [CommonModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './historial-seguimiento.html',
  styleUrl: './historial-seguimiento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialSeguimiento {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  protected readonly authService = inject(AuthService);

  protected readonly pacienteId = signal<number>(
    Number(this.route.snapshot.paramMap.get('id'))
  );

  protected readonly isNutriologo = computed(() => this.authService.currentUserRole() === UserRole.NUTRIOLOGO);
  protected readonly isAdmin = computed(() => this.authService.currentUserRole() === UserRole.ADMINISTRADOR);

  protected readonly pacienteResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) => this.pacienteService.obtenerPacientePorId(params.id),
  });

  protected readonly seguimientosResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) => this.seguimientoService.listarPorPaciente(params.id, 0, 50),
  });

  protected readonly seleccionado = signal<SeguimientoConsulta | null>(null);

  protected verDetalle(item: SeguimientoConsulta): void {
    this.seleccionado.set(this.seleccionado()?.id === item.id ? null : item);
  }

  protected async eliminar(item: SeguimientoConsulta): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar consulta de seguimiento',
      `¿Estás seguro de que deseas eliminar el seguimiento del período ${item.fechaInicio} al ${item.fechaFin}? Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      this.seguimientoService.eliminar(item.id).subscribe({
        next: () => {
          this.notificationService.success('Consulta de seguimiento eliminada correctamente.');
          this.seguimientosResource.reload();
          if (this.seleccionado()?.id === item.id) {
            this.seleccionado.set(null);
          }
        },
        error: (err) => {
          this.notificationService.error(err.error?.mensaje || 'Error al eliminar la consulta de seguimiento.');
        }
      });
    }
  }

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

  protected irANuevo(): void {
    this.router.navigate(['/main/pacientes', this.pacienteId(), 'seguimiento', 'nuevo']);
  }

  protected irAEditar(item: SeguimientoConsulta): void {
    this.router.navigate(['/main/pacientes', this.pacienteId(), 'seguimiento', item.id, 'editar']);
  }
}


