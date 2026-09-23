export interface Paciente {
  id?: number;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  genero: string;
  correo: string;
  fechaNacimiento: string;
  rol: string;
  telefono: string;
  nutriologoId?: number;
  nombreNutriologo?: string;
  apellidoPaternoNutriologo?: string;
}

export interface PacienteRequest {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  genero: string;
  correo: string;
  fechaNacimiento: string;
  telefono: string;
  rol: string;
}
