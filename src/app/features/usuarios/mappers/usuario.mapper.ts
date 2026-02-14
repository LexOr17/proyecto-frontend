import { Usuario } from "../interfaces/usuario-request";

// Cambiamos el tipo de retorno a UsuarioRequest
export const mapRegistroFormToRequest = (formValue: any): Usuario => {
  return {
    nombre: formValue.nombre || '',
    apellidoPaterno: formValue.apellidoPaterno || '',
    apellidoMaterno: formValue.apellidoMaterno || undefined,
    correo: formValue.correo || '',
    telefono: formValue.telefono || '',
    // Aseguramos que fechaNacimiento sea string (si viene del form ya lo es)
    fechaNacimiento: formValue.fechaNacimiento || '', 
    genero: formValue.genero || 'MASCULINO',
    rol: formValue.rol || 'PACIENTE',
    
    cedulaProfesional: formValue.rol === 'NUTRIOLOGO' 
      ? (formValue.cedulaProfesional || undefined) 
      : undefined,
      
    // AQUI EL FIX:
    // Al usar UsuarioRequest con nutriologo_id?: number, 
    // TypeScript acepta 'undefined' perfectamente.
    nutriologo_id: (formValue.rol === 'PACIENTE' && formValue.nutriologoId)
      ? Number(formValue.nutriologoId) 
      : undefined
  };
};