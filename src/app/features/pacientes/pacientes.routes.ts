import { Routes } from '@angular/router';
import { ListaPacientes } from './pages/lista-pacientes/lista-pacientes';
import { RegistroPacientes } from './pages/registro-pacientes/registro-pacientes';
import { SeguimientoPaciente } from './pages/seguimiento-paciente/seguimiento-paciente';

const pacientesRoutes: Routes = [
  {
    path: '',
    component: ListaPacientes,
    title: 'Pacientes',
  },
  {
    path: 'nuevo',
    component: RegistroPacientes,
    title: 'Nuevo Paciente',
  },
  {
    path: 'editar/:id',
    component: RegistroPacientes,
    title: 'Editar Paciente',
  },
  {
    path: ':id',
    component: SeguimientoPaciente,
    title: 'Seguimiento del Paciente',
  }
];

export default pacientesRoutes;
