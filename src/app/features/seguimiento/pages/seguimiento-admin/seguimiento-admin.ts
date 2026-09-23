import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { SeguimientoService } from '../../../pacientes/service/seguimiento-service';
import { SeguimientoConsulta } from '../../../pacientes/interfaces/seguimiento.interface';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';

@Component({
  selector: 'app-seguimiento-admin',
  imports: [CommonModule, DatePipe, DecimalPipe],
  templateUrl: './seguimiento-admin.html',
  styleUrl: './seguimiento-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoAdmin {
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);

  protected readonly todosResource = rxResource({
    stream: () => this.seguimientoService.listarTodos(0, 100),
  });

  protected readonly seleccionado = signal<SeguimientoConsulta | null>(null);

  protected verDetalle(item: SeguimientoConsulta): void {
    this.seleccionado.set(this.seleccionado()?.id === item.id ? null : item);
  }

  protected async eliminar(item: SeguimientoConsulta): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar consulta de seguimiento',
      `¿Estás seguro de que deseas eliminar la consulta de seguimiento de ${item.pacienteNombre} (${item.fechaInicio} a ${item.fechaFin})? Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      this.seguimientoService.eliminar(item.id).subscribe({
        next: () => {
          this.notificationService.success('Consulta de seguimiento eliminada correctamente.');
          this.todosResource.reload();
          if (this.seleccionado()?.id === item.id) {
            this.seleccionado.set(null);
          }
        },
        error: (err) => {
          this.notificationService.error(err.error?.mensaje || 'Error al eliminar el seguimiento.');
        }
      });
    }
  }
}

