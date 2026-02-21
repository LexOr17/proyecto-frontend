export interface ApiResponse<T> {
    mensaje: string;
    estatus: number;
    datos: T;
    timestamp: string;
}

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
    nutriologo_id?: number;
    cedulaProfesional?: string;
}

export interface Dato {
    id: number;
    nombre: string;
    apellido: string;
}

