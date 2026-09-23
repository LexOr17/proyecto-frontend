import { Routes } from '@angular/router';

const misPlanesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-mis-planes/lista-mis-planes').then(m => m.ListaMisPlanes),
    title: 'Mis Planes Alimenticios',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/ver-mi-plan/ver-mi-plan').then(m => m.VerMiPlan),
    title: 'Mi Plan Alimenticio',
  },
];

export default misPlanesRoutes;
