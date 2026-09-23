import { Routes } from '@angular/router';
import { DashboardReportes } from './pages/dashboard-reportes/dashboard-reportes';
import { MiProgreso } from './pages/mi-progreso/mi-progreso';

export const reportesRoutes: Routes = [
  {
    path: '',
    component: DashboardReportes,
    title: 'Reportes',
  },
];

export const miProgresoRoutes: Routes = [
  {
    path: '',
    component: MiProgreso,
    title: 'Mi Progreso Corporal',
  },
];
