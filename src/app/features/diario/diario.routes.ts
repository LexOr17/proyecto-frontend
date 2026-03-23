import { Routes } from '@angular/router';

const diarioNutriologoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/diario-nutriologo/diario-nutriologo').then(m => m.DiarioNutriologo),
    title: 'Diario de Pacientes',
  },
  {
    path: 'paciente/:pacienteId',
    loadComponent: () =>
      import('./pages/diario-nutriologo/diario-nutriologo').then(m => m.DiarioNutriologo),
    title: 'Historial Alimenticio',
  },
];

const diarioAdminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/diario-admin/diario-admin').then(m => m.DiarioAdmin),
    title: 'Control de Diarios',
  },
];

export { diarioNutriologoRoutes, diarioAdminRoutes };
