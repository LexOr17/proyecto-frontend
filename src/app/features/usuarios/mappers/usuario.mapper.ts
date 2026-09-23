import { UsuarioRequest } from "../interfaces/usuario-request";

interface RegistroFormValue {
  nombre: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  correo: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  rol: string | null;
  cedulaProfesional: string | null;
  nutriologoId: string | number | null;
}

export const mapRegistroFormToRequest = (formValue: RegistroFormValue): UsuarioRequest => {
  return {
    nombre: formValue.nombre || '',
    apellidoPaterno: formValue.apellidoPaterno || '',
    apellidoMaterno: formValue.apellidoMaterno || undefined,
    correo: formValue.correo || '',
    telefono: formValue.telefono || '',
    fechaNacimiento: formValue.fechaNacimiento || '',
    genero: formValue.genero || 'MASCULINO',
    rol: formValue.rol || 'PACIENTE',

    cedulaProfesional: formValue.rol === 'NUTRIOLOGO'
      ? (formValue.cedulaProfesional || undefined)
      : undefined,

    nutriologo_id: (formValue.rol === 'PACIENTE' && formValue.nutriologoId)
      ? Number(formValue.nutriologoId)
      : undefined
  };
};