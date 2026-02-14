import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { UsuarioService } from '../../service/usuario-service';
import { Usuario, UsuarioResponse } from '../../interfaces/usuario-request';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lista-usuarios',
  imports: [CommonModule, FormsModule],
  templateUrl: './lista-usuarios.html',
  styleUrl: './lista-usuarios.css',
})
export class ListaUsuarios implements OnInit {

  private usuarioService = inject(UsuarioService);
  
  usuarios = signal<Usuario[]>([]);
  searchTerm = signal<string>('');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Computed signal para filtrar usuarios según el término de búsqueda
  usuariosFiltrados = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return this.usuarios();
    }
    return this.usuarios().filter(usuario => 
      usuario.nombre.toLowerCase().includes(term) ||
      usuario.apellidoPaterno.toLowerCase().includes(term) ||
      usuario.apellidoMaterno?.toLowerCase().includes(term) ||
      usuario.correo.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    this.usuarioService.obtenerUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
        this.errorMessage.set('Error al cargar los usuarios. Por favor, intenta de nuevo.');
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  obtenerIniciales(usuario: Usuario): string {
    const inicial1 = usuario.nombre.charAt(0).toUpperCase();
    const inicial2 = usuario.apellidoPaterno.charAt(0).toUpperCase();
    return inicial1 + inicial2;
  }

  obtenerColorAvatar(index: number): { backgroundColor: string; color: string } {
    const colores = [
      { backgroundColor: '#E8F5E9', color: '#2E7D32' },
      { backgroundColor: '#E3F2FD', color: '#1565C0' },
      { backgroundColor: '#EDE7F6', color: '#673AB7' },
      { backgroundColor: '#FFF3E0', color: '#E65100' },
      { backgroundColor: '#FCE4EC', color: '#C2185B' },
    ];
    return colores[index % colores.length];
  }

  obtenerClaseBadge(rol: string): string {
    const rolLower = rol.toLowerCase();
    if (rolLower.includes('nutri')) return 'badge-nutri';
    if (rolLower.includes('paciente')) return 'badge-paciente';
    if (rolLower.includes('admin')) return 'badge-admin';
    return 'badge-nutri';
  }

  editarUsuario(usuario: Usuario): void {
    console.log('Editar usuario:', usuario);
    // Implementar lógica de edición
  }

  eliminarUsuario(usuario: UsuarioResponse): void {
    if (!usuario.id) {
      this.errorMessage.set('No se puede eliminar el usuario: ID no disponible');
      return;
    }

    if (confirm(`¿Estás seguro de eliminar a ${usuario.nombre} ${usuario.apellidoPaterno}?`)) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      
      this.usuarioService.eliminarUsuario(usuario.id).subscribe({
        next: () => {
          // Actualizar la lista eliminando el usuario
          this.usuarios.update(usuarios => 
            usuarios.filter(u => u.nombre !== usuario.nombre)
          );
          this.isLoading.set(false);
          console.log('Usuario eliminado correctamente');
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);
          this.errorMessage.set('Error al eliminar el usuario. Por favor, intenta de nuevo.');
          this.isLoading.set(false);
        }
      });
    }
  }

}
