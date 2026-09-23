export type EnfermedadEnum =
  | 'DIABETES_TIPO_1'
  | 'DIABETES_TIPO_2'
  | 'HIPOTIROIDISMO'
  | 'HIPERTIROIDISMO'
  | 'SINDROME_METABOLICO'
  | 'OBESIDAD'
  | 'HIPERTENSION'
  | 'ENFERMEDAD_CARDIACA'
  | 'INSUFICIENCIA_CARDIACA'
  | 'COLESTEROL_ALTO'
  | 'TRIGLICERIDOS_ALTOS'
  | 'ASMA'
  | 'EPOC'
  | 'RINITIS_ALERGICA'
  | 'ENFERMEDAD_HEPATICA'
  | 'HIGADO_GRASO'
  | 'ENFERMEDAD_RENAL'
  | 'COLITIS'
  | 'GASTRITIS'
  | 'SINDROME_INTESTINO_IRRITABLE'
  | 'ARTRITIS'
  | 'OSTEOPOROSIS'
  | 'GOTA'
  | 'CANCER'
  | 'VIH_SIDA'
  | 'NINGUNA'
  | 'OTRA';

export type SintomaEnum =
  | 'FIEBRE'
  | 'CANSANCIO_FATIGA'
  | 'PERDIDA_DE_PESO'
  | 'AUMENTO_DE_PESO'
  | 'SUDORACION_EXCESIVA'
  | 'DEBILIDAD_GENERAL'
  | 'NAUSEAS'
  | 'VOMITO'
  | 'DIARREA'
  | 'ESTRENIMIENTO'
  | 'DOLOR_ABDOMINAL'
  | 'DISTENSION_ABDOMINAL'
  | 'REFLUJO'
  | 'PERDIDA_DE_APETITO'
  | 'AUMENTO_DE_APETITO'
  | 'DIFICULTAD_PARA_RESPIRAR'
  | 'DOLOR_EN_EL_PECHO'
  | 'PALPITACIONES'
  | 'TOS'
  | 'CONGESTION_NASAL'
  | 'DOLOR_DE_CABEZA'
  | 'MAREO'
  | 'INSOMNIO'
  | 'ANSIEDAD'
  | 'DEPRESION'
  | 'DOLOR_MUSCULAR'
  | 'DOLOR_ARTICULAR'
  | 'CALAMBRES'
  | 'INFLAMACION'
  | 'SED_EXCESIVA'
  | 'ORINA_FRECUENTE'
  | 'CAMBIOS_EN_LA_PIEL'
  | 'CAIDA_DE_CABELLO'
  | 'NINGUNO'
  | 'OTRO';

export type EstadoMedicamento = 'NUNCA' | 'ACTUALMENTE' | 'ANTERIORMENTE';

export interface MedidaResumenHistorial {
  id: number;
  peso: number;
  altura: number;
  cintura?: number;
  cadera?: number;
  cuello?: number;
  fechaMedicion: string;
  pacienteId: number;
}

export interface HistorialMedicoRequest {
  enfermedades?: EnfermedadEnum[];
  otraEnfermedad?: string;
  alergias?: string;
  sintomas?: SintomaEnum[];
  otroSintoma?: string;
  estadoMedicamento: EstadoMedicamento;
  descripcionMedicamento?: string;
  medidaAntropometricaId?: number;
}

export interface HistorialMedicoItem {
  id: number;
  enfermedades: EnfermedadEnum[];
  otraEnfermedad?: string;
  alergias?: string;
  sintomas: SintomaEnum[];
  otroSintoma?: string;
  estadoMedicamento: EstadoMedicamento;
  descripcionMedicamento?: string;
  fechaRegistro: string;
  pacienteId: number;
  medidaAntropometrica?: MedidaResumenHistorial;
}
