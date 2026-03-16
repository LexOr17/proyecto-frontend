import { Alimento } from '../../alimentos/interfaces/alimento.interface';

export type TipoComida = 'DESAYUNO' | 'ALMUERZO' | 'MERIENDA' | 'CENA';

export interface Plantilla {
  id: number;
  nombre: string;
  tipoComida: TipoComida;
  fechaCreacion: string;
  alimentos: Alimento[];
}

export interface PlantillaRequest {
  nombre: string;
  tipoComida: TipoComida;
  usuarioId: number;
  alimentoIds: number[];
}

export const TIPOS_COMIDA: { value: TipoComida; label: string; icon: string }[] = [
  { value: 'DESAYUNO', label: 'Desayuno', icon: '☀️' },
  { value: 'ALMUERZO', label: 'Almuerzo', icon: '🍲' },
  { value: 'MERIENDA', label: 'Merienda', icon: '🍎' },
  { value: 'CENA', label: 'Cena', icon: '🌙' },
];
