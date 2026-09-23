export type TipoComida = 'DESAYUNO' | 'ALMUERZO' | 'MERIENDA' | 'CENA';

export interface PlantillaAlimentoResponse {
  alimentoId: number;
  nombreAlimento: string;
  cantidad: number;
  porcionBase?: number;
  unidadPorcion: string;
}

export interface PlantillaAlimentoRequest {
  alimentoId: number;
  cantidad: number;
}

export interface Plantilla {
  id: number;
  nombre: string;
  tipoComida: TipoComida;
  fechaCreacion: string;
  detalles: PlantillaAlimentoResponse[];
  totalCalorias: number;
  totalProteinas: number;
  totalCarbohidratos: number;
  totalGrasas: number;
}

export interface PlantillaRequest {
  nombre: string;
  tipoComida: TipoComida;
  alimentos: PlantillaAlimentoRequest[];
}

export const TIPOS_COMIDA: { value: TipoComida; label: string; icon: string }[] = [
  { value: 'DESAYUNO', label: 'Desayuno', icon: '☀️' },
  { value: 'ALMUERZO', label: 'Almuerzo', icon: '🍲' },
  { value: 'MERIENDA', label: 'Merienda', icon: '🍎' },
  { value: 'CENA', label: 'Cena', icon: '🌙' },
];
