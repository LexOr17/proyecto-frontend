export interface ApiResponse<T> {
  mensaje: string;
  estatus: number;
  datos: T;
  timestamp: string;
}

export interface Alimento {
  id?: number;
  nombre: string;
  categoria: string;
  calorias: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
  porcionBase: number;
  unidadPorcion: string;
  imagenUrl?: string;
  fechaRegistro?: string;
}

export interface AlimentoRequest {
  nombre: string;
  categoria: string;
  calorias: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
  porcionBase: number;
  unidadPorcion: string;
}

export type CategoriaAlimento =
  | 'FRUTAS'
  | 'VERDURAS'
  | 'CEREALES'
  | 'LEGUMINOSAS'
  | 'LACTEOS'
  | 'CARNES'
  | 'GRASAS'
  | 'AZUCARES';

export const CATEGORIAS_ALIMENTO: { value: CategoriaAlimento; label: string }[] = [
  { value: 'FRUTAS', label: 'Frutas' },
  { value: 'VERDURAS', label: 'Verduras' },
  { value: 'CEREALES', label: 'Cereales' },
  { value: 'LEGUMINOSAS', label: 'Leguminosas' },
  { value: 'LACTEOS', label: 'Lácteos' },
  { value: 'CARNES', label: 'Carnes' },
  { value: 'GRASAS', label: 'Grasas' },
  { value: 'AZUCARES', label: 'Azúcares' },
];

export const UNIDADES_PORCION: { value: string; label: string }[] = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'pieza', label: 'Pieza' },
  { value: 'taza', label: 'Taza' },
  { value: 'cucharada', label: 'Cucharada' },
];
