import { AlimentoRequest } from '../interfaces/alimento.interface';

interface AlimentoFormValue {
  nombre: string;
  categoria: string;
  calorias: string;
  proteina: string;
  carbohidratos: string;
  grasas: string;
  porcionBase: string;
  unidadPorcion: string;
}

export const mapAlimentoFormToRequest = (formValue: AlimentoFormValue): AlimentoRequest => {
  return {
    nombre: formValue.nombre.trim(),
    categoria: formValue.categoria,
    calorias: Number(formValue.calorias),
    proteina: Number(formValue.proteina),
    carbohidratos: Number(formValue.carbohidratos),
    grasas: Number(formValue.grasas),
    porcionBase: Number(formValue.porcionBase),
    unidadPorcion: formValue.unidadPorcion,
  };
};

export const buildAlimentoFormData = (
  request: AlimentoRequest,
  imagen: File | null
): FormData => {
  const formData = new FormData();

  // El backend espera @RequestPart("datos") como JSON
  const datosBlob = new Blob([JSON.stringify(request)], { type: 'application/json' });
  formData.append('datos', datosBlob);

  if (imagen) {
    formData.append('imagen', imagen);
  }

  return formData;
};
