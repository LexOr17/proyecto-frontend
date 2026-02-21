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
}

export enum UserRole {
  ADMINISTRADOR = 'ADMINISTRADOR',
  NUTRIOLOGO = 'NUTRIOLOGO',
  PACIENTE = 'PACIENTE'
}
