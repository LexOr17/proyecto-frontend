import { TipoComida } from '../../plantillas/interfaces/plantilla.interface';

export interface PlanAlimenticioRequest {
  nombre: string;
  fechaInicio: string;
  duracionDias: number;
  pacienteId: number;
  nutriologoId: number;
  comidas: ComidaProgramadaRequest[];
}

export interface ComidaProgramadaRequest {
  plantillaId: number;
  diaPlan: number;
  horario: TipoComida;
  observaciones?: string;
}

export interface PlanAlimenticioResponse {
  id: number;
  nombre: string;
  fechaInicio: string;
  duracionDias: number;
  fechaCreacion: string;
  pacienteId: number;
  nutriologoId: number;
  comidasProgramadas: ComidaProgramadaResponse[];
}

export interface ComidaProgramadaResponse {
  id: number;
  plantillaId: number;
  plantillaNombre: string;
  diaPlan: number;
  horario: TipoComida;
  observaciones: string;
}

export interface ComidaLocal {
  id?: number;
  plantillaId: number;
  plantillaNombre: string;
  diaPlan: number;
  horario: TipoComida;
  observaciones: string;
}

export interface PlanCreacionState {
  pacienteId: number;
  pacienteNombre: string;
  nombre: string;
  fechaInicio: string;
  duracionDias: number;
}
