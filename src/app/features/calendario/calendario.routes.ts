import { Routes } from '@angular/router';

const calendarioRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/calendario-page/calendario-page').then(m => m.CalendarioPage),
    title: 'Calendario',
  },
];

export default calendarioRoutes;
