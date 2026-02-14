import { Routes } from '@angular/router';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { DashboardPage } from './pages/dashboard-page/dashboard-page';
import { authGuard } from '../../core/guards/auth-guard';

const mainRoutes: Routes = [
  {
    path: '',
    component: MainLayout,
    canMatch: [authGuard],
    data: { roles: ['ADMINISTRADOR','NUTRIOLOGO','PACIENTE'] },
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        component: DashboardPage,
        title: 'Dashboard',
      },
      {
        path: 'usuarios',
        loadChildren: () => import('../usuarios/usuarios.routes').then(m => m.default),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      }
    ]
  }
];

export default mainRoutes;
