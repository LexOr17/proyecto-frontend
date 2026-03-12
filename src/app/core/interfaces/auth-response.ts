export interface ApiResponse<T> {
    mensaje:   string;
    estatus:   number;
    datos:     T | null;
    timestamp: string;
}

export interface AuthResponse {
    mensaje:   string;
    estatus:   number;
    datos:     Datos | null;
    timestamp: string;
}

export interface Datos {
    token:          string;
    rol:            string;
    expirationTime: string;
    nombre:         string;
    apellidos:      string;
    id:             string;
}

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  NUTRIOLOGO = 'NUTRIOLOGO',
  PACIENTE = 'PACIENTE'
}
