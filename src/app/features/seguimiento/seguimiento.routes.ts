import { Routes } from '@angular/router';

export const miSeguimientoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/mi-seguimiento/mi-seguimiento').then(m => m.MiSeguimiento),
    title: 'Mi Seguimiento',
  },
];

export const seguimientoAdminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/seguimiento-admin/seguimiento-admin').then(m => m.SeguimientoAdmin),
    title: 'Gestión de Seguimientos',
  },
];
