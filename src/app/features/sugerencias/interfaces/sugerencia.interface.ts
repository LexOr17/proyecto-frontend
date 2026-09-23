import { TipoComida } from '../../plantillas/interfaces/plantilla.interface';
import {
  PlantillaAlimentoRequest,
  PlantillaAlimentoResponse,
} from '../../plantillas/interfaces/plantilla.interface';

export type EstadoSugerencia = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export type CategoriaMotivoSugerencia =
  | 'PREFERENCIA_SABOR'
  | 'DISPONIBILIDAD_COSTO'
  | 'INTOLERANCIA_DIGESTION'
  | 'TIEMPO_PREPARACION'
  | 'SACIEDAD_ENERGIA'
  | 'VARIEDAD_MENU'
  | 'OTRO';

export interface CategoriaMotivoInfo {
  value: CategoriaMotivoSugerencia;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
}

export const CATEGORIAS_MOTIVO_SUGERENCIA: CategoriaMotivoInfo[] = [
  {
    value: 'PREFERENCIA_SABOR',
    label: 'Gusto o Sabor',
    sublabel: 'Preferencia personal o palatabilidad',
    icon: 'bx-dish',
    color: '#038141',
  },
  {
    value: 'DISPONIBILIDAD_COSTO',
    label: 'Disponibilidad o Costo',
    sublabel: 'Ingredientes difíciles de conseguir o presupuesto',
    icon: 'bx-shopping-bag',
    color: '#85bb2f',
  },
  {
    value: 'INTOLERANCIA_DIGESTION',
    label: 'Digestión o Intolerancia',
    sublabel: 'Pesadez, reflujo o sospecha de alergia',
    icon: 'bx-plus-medical',
    color: '#ee8100',
  },
  {
    value: 'TIEMPO_PREPARACION',
    label: 'Tiempo de Cocina',
    sublabel: 'Horarios complicados o receta laboriosa',
    icon: 'bx-time-five',
    color: '#0284c7',
  },
  {
    value: 'SACIEDAD_ENERGIA',
    label: 'Saciedad o Energía',
    sublabel: 'Quedo con hambre o con poca energía',
    icon: 'bx-bolt-circle',
    color: '#fecb02',
  },
  {
    value: 'VARIEDAD_MENU',
    label: 'Variedad o Monotonía',
    sublabel: 'Deseo rotar y probar opciones distintas',
    icon: 'bx-sync',
    color: '#8b5cf6',
  },
  {
    value: 'OTRO',
    label: 'Otro Motivo',
    sublabel: 'Razón personalizada o circunstancial',
    icon: 'bx-comment-detail',
    color: '#64748b',
  },
];

export interface Sugerencia {
  id: number;
  nombre: string;
  tipoComida: TipoComida;
  estado: EstadoSugerencia;
  categoriaMotivo?: CategoriaMotivoSugerencia;
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
  categoriaMotivo?: CategoriaMotivoSugerencia;
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
