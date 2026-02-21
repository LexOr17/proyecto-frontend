import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UsuarioService } from '../../service/usuario-service';
import { Usuario } from '../../interfaces/usuario-request';
import { Router, RouterLink } from '@angular/router';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

@Component({
  selector: 'app-lista-usuarios',
  imports: [RouterLink, Pagination],
  templateUrl: './lista-usuarios.html',
  styleUrl: './lista-usuarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaUsuarios {

  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected searchTerm = signal('');
  protected isDeleting = signal<number | null>(null);

  // Paginación
  protected currentPage = signal(0);
  protected pageSize = signal(10);

  // rxResource: carga reactiva de usuarios
  protected usuariosResource = rxResource({
    params: () => ({ page: this.currentPage(), size: this.pageSize() }),
    stream: ({ params }) => this.usuarioService.obtenerUsuarios(params.page, params.size),
  });

  // Computed: filtro local sobre los datos ya cargados
  protected usuariosFiltrados = computed(() => {
    const usuarios = this.usuariosResource.value()?.content ?? [];
    const term = this.searchTerm().toLowerCase();
    if (!term) return usuarios;
    return usuarios.filter(usuario =>
      usuario.nombre.toLowerCase().includes(term) ||
      usuario.apellidoPaterno.toLowerCase().includes(term) ||
      usuario.apellidoMaterno?.toLowerCase().includes(term) ||
      usuario.correo.toLowerCase().includes(term)
    );
  });

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
    // rxResource re-ejecuta automáticamente al detectar cambio en params
  }

  protected onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  protected obtenerIniciales(usuario: Usuario): string {
    const inicial1 = usuario.nombre.charAt(0).toUpperCase();
    const inicial2 = usuario.apellidoPaterno.charAt(0).toUpperCase();
    return inicial1 + inicial2;
  }

  protected obtenerColorAvatar(index: number): { backgroundColor: string; color: string } {
    const colores = [
      { backgroundColor: '#E8F5E9', color: '#2E7D32' },
      { backgroundColor: '#E3F2FD', color: '#1565C0' },
      { backgroundColor: '#EDE7F6', color: '#673AB7' },
      { backgroundColor: '#FFF3E0', color: '#E65100' },
      { backgroundColor: '#FCE4EC', color: '#C2185B' },
    ];
    return colores[index % colores.length];
  }

  protected obtenerClaseBadge(rol: string): string {
    const rolLower = rol.toLowerCase();
    if (rolLower.includes('nutri')) return 'badge-nutri';
    if (rolLower.includes('paciente')) return 'badge-paciente';
    if (rolLower.includes('admin')) return 'badge-admin';
    return 'badge-nutri';
  }

  protected editarUsuario(usuario: Usuario): void {
    if (usuario.id) {
      this.router.navigate(['/main/usuarios/editar', usuario.id]);
    }
  }

  protected async eliminarUsuario(usuario: Usuario): Promise<void> {
    if (!usuario.id) {
      return;
    }

    const confirmed = await this.confirmDialog.open(
      'Eliminar usuario',
      `¿Estás seguro de eliminar a ${usuario.nombre} ${usuario.apellidoPaterno}?`
    );

    if (confirmed) {
      this.isDeleting.set(usuario.id);
      
      this.usuarioService.eliminarUsuario(usuario.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.notificationService.success('Usuario eliminado correctamente');
            this.usuariosResource.reload();
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
