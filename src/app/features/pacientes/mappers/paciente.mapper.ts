import { PacienteRequest } from '../interfaces/paciente.interface';

interface PacienteFormValue {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  correo: string;
  telefono: string;
  fechaNacimiento: string;
  genero: string;
}

export const mapPacienteFormToRequest = (formValue: PacienteFormValue): PacienteRequest => {
  return {
    nombre: formValue.nombre,
    apellidoPaterno: formValue.apellidoPaterno,
    apellidoMaterno: formValue.apellidoMaterno || undefined,
    correo: formValue.correo,
    telefono: formValue.telefono,
    fechaNacimiento: formValue.fechaNacimiento,
    genero: formValue.genero,
    rol: 'PACIENTE',
  };
};
