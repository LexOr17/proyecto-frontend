import { Routes } from '@angular/router';
import { ListaPacientes } from './pages/lista-pacientes/lista-pacientes';
import { RegistroPacientes } from './pages/registro-pacientes/registro-pacientes';
import { SeguimientoPaciente } from './pages/seguimiento-paciente/seguimiento-paciente';
import { MedidasAntropometricas } from './pages/medidas-antropometricas/medidas-antropometricas';
import { HistorialMedicoPaciente } from './pages/historial-medico/historial-medico';

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
    title: 'Perfil del Paciente',
  },
  {
    path: ':id/seguimiento',
    loadComponent: () => import('./pages/historial-seguimiento/historial-seguimiento').then(m => m.HistorialSeguimiento),
    title: 'Historial de Seguimiento',
  },
  {
    path: ':id/seguimiento/nuevo',
    loadComponent: () => import('./pages/nueva-consulta-seguimiento/nueva-consulta-seguimiento').then(m => m.NuevaConsultaSeguimiento),
    title: 'Nueva Consulta de Seguimiento',
  },
  {
    path: ':id/seguimiento/:seguimientoId/editar',
    loadComponent: () => import('./pages/nueva-consulta-seguimiento/nueva-consulta-seguimiento').then(m => m.NuevaConsultaSeguimiento),
    title: 'Editar Observaciones',
  },
  {
    path: ':id/medidas',
    component: MedidasAntropometricas,
    title: 'Medidas Antropométricas',
  },
  {
    path: ':id/historial-medico',
    component: HistorialMedicoPaciente,
    title: 'Historial Médico',
  },
];

export default pacientesRoutes;
