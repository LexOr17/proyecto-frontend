import { Routes } from '@angular/router';

const misDiarioRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/diario-paciente/diario-paciente').then(m => m.DiarioPaciente),
    title: 'Mi Diario de Comidas',
  },
];

export default misDiarioRoutes;
