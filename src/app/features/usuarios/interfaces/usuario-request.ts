export interface Usuario {
    nombre: string;
    apellidoMaterno: string;
    apellidoPaterno: string;
    genero: string;
    correo: string;
    fechaNacimiento: Date;
    rol: string;
    telefono: string;
    nutriologo_id?: number;
    cedulaProfesional: string;
}

export interface UsuarioResponse {
    id?: number;
    nombre: string;
    apellidoMaterno: string;
    apellidoPaterno: string;
    genero: string;
    correo: string;
    fechaNacimiento: Date;
    rol: string;
    telefono: string;
    nutriologo_id?: number;
    cedulaProfesional: string;
}

export interface SelectorNutiologos {
    mensaje: string;
    estatus: number;
    datos: Dato[];
    timestamp: Date;
}

export interface Dato {
    id: number;
    nombre: string;
    apellido: string;
}

