export interface MedidaAntropometricaRequest {
  peso: number;
  altura: number;
  cintura?: number;
  cadera?: number;
  cuello?: number;
}

export interface MedidaAntropometrica {
  id: number;
  peso: number;
  altura: number;
  cintura?: number;
  cadera?: number;
  cuello?: number;
  fechaMedicion: string;
  pacienteId: number;
}
