import { TipoComida } from '../../plantillas/interfaces/plantilla.interface';
import {
  PlantillaAlimentoRequest,
  PlantillaAlimentoResponse,
} from '../../plantillas/interfaces/plantilla.interface';

export type EstadoSugerencia = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface Sugerencia {
  id: number;
  nombre: string;
  tipoComida: TipoComida;
  estado: EstadoSugerencia;
  motivoSugerencia: string | null;
  comentarioNutriologo: string | null;
  plantillaOriginalId: number | null;
  fechaEnvio: string;
  fechaRevision: string | null;
  pacienteId: number;
  nutriologoId: number;
  detalles: PlantillaAlimentoResponse[];
  totalCalorias: number;
  totalProteinas: number;
  totalCarbohidratos: number;
  totalGrasas: number;
}

export interface SugerenciaRequest {
  nombre: string;
  tipoComida: TipoComida;
  motivoSugerencia?: string;
  plantillaOriginalId?: number;
  alimentos: PlantillaAlimentoRequest[];
}

export interface SugerenciaRevision {
  estado: 'APROBADA' | 'RECHAZADA';
  comentarioNutriologo?: string;
}

export const ESTADOS_SUGERENCIA: {
  value: EstadoSugerencia;
  label: string;
  color: string;
}[] = [
  { value: 'PENDIENTE', label: 'Pendiente', color: '#f39c12' },
  { value: 'APROBADA', label: 'Aprobada', color: '#27ae60' },
  { value: 'RECHAZADA', label: 'Rechazada', color: '#e74c3c' },
];
