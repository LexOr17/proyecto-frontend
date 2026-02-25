import { Routes } from '@angular/router';
import { ListaPacientes } from './pages/lista-pacientes/lista-pacientes';
import { RegistroPacientes } from './pages/registro-pacientes/registro-pacientes';

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
  }
];

export default pacientesRoutes;
