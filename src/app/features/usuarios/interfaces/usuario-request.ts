// Usa ApiResponse<T> desde core/interfaces/auth-response.ts

export interface Usuario {
    id?: number;
    nombre: string;
    apellidoMaterno?: string;
    apellidoPaterno: string;
    genero: string;
    correo: string;
    fechaNacimiento: string;
    rol: string;
    telefono: string;
    activo?: boolean;
    nutriologoId?: number;
    cedulaProfesional?: string;
}

export interface UsuarioRequest {
    nombre: string;
    apellidoMaterno?: string;
    apellidoPaterno: string;
    genero: string;
    correo: string;
    fechaNacimiento: string;
    rol: string;
    telefono: string;
    activo?: boolean;
    nutriologo_id?: number;
    cedulaProfesional?: string;
}

export interface Dato {
    id: number;
    nombre: string;
    apellido: string;
}

