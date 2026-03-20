import { Routes } from '@angular/router';

const planesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-planes/lista-planes').then(m => m.ListaPlanes),
    title: 'Planes Alimenticios',
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/editor-plan/editor-plan').then(m => m.EditorPlan),
    title: 'Nuevo Plan Alimenticio',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/editor-plan/editor-plan').then(m => m.EditorPlan),
    title: 'Editar Plan Alimenticio',
  },
];

export default planesRoutes;
