// Interface que representa la respuesta del backend para un usuario
export interface UsuarioResponseDTO {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  correo: string;
  telefono: string;
  genero: string;
  fechaNacimiento: string;
  rol: string;
  activo: boolean;
  cedulaProfesional?: string;
  nutriologoId?: number;
}
