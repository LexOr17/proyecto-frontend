import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PacienteService } from '../../service/paciente-service';
import { Paciente } from '../../interfaces/paciente.interface';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

@Component({
  selector: 'app-lista-pacientes',
  imports: [RouterLink, Pagination],
  templateUrl: './lista-pacientes.html',
  styleUrl: './lista-pacientes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaPacientes {

  private readonly pacienteService = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected searchTerm = signal('');
  protected isDeleting = signal<number | null>(null);

  // Paginación
  protected currentPage = signal(0);
  protected pageSize = signal(5);

  // rxResource: carga reactiva de pacientes
  protected pacientesResource = rxResource({
    params: () => ({ page: this.currentPage(), size: this.pageSize() }),
    stream: ({ params }) => this.pacienteService.obtenerPacientes(params.page, params.size),
  });

  // Computed: filtro local sobre los datos ya cargados
  protected pacientesFiltrados = computed(() => {
    const pacientes = this.pacientesResource.value()?.content ?? [];
    const term = this.searchTerm().toLowerCase();
    if (!term) return pacientes;
    return pacientes.filter(paciente =>
      paciente.nombre.toLowerCase().includes(term) ||
      paciente.apellidoPaterno.toLowerCase().includes(term) ||
      paciente.apellidoMaterno?.toLowerCase().includes(term) ||
      paciente.correo.toLowerCase().includes(term)
    );
  });

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
  }

  protected onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected obtenerIniciales(paciente: Paciente): string {
    const inicial1 = paciente.nombre.charAt(0).toUpperCase();
    const inicial2 = paciente.apellidoPaterno.charAt(0).toUpperCase();
    return inicial1 + inicial2;
  }

  protected obtenerColorAvatar(index: number): { backgroundColor: string; color: string } {
    const colores = [
      { backgroundColor: '#E3F2FD', color: '#1565C0' },
      { backgroundColor: '#E8F5E9', color: '#2E7D32' },
      { backgroundColor: '#EDE7F6', color: '#673AB7' },
      { backgroundColor: '#FFF3E0', color: '#E65100' },
      { backgroundColor: '#FCE4EC', color: '#C2185B' },
    ];
    return colores[index % colores.length];
  }

  protected editarPaciente(paciente: Paciente): void {
    if (paciente.id) {
      this.router.navigate(['/main/pacientes/editar', paciente.id]);
    }
  }

  protected async eliminarPaciente(paciente: Paciente): Promise<void> {
    if (!paciente.id) return;

    const confirmed = await this.confirmDialog.open(
      'Eliminar paciente',
      `¿Estás seguro de eliminar a ${paciente.nombre} ${paciente.apellidoPaterno}?`
    );

    if (confirmed) {
      this.isDeleting.set(paciente.id);

      this.pacienteService.eliminarPaciente(paciente.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notificationService.success('Paciente eliminado correctamente');
            this.pacientesResource.reload();
            this.isDeleting.set(null);
          },
          error: () => {
            this.isDeleting.set(null);
          }
        });
    }
  }

  protected formatearTelefono(telefono: string | undefined): string {
    if (!telefono) return '-';
    const value = telefono.replace(/\D/g, '');
    if (value.length === 10) {
      return `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6, 10)}`;
    }
    return telefono;
  }
}
