import { Routes } from '@angular/router';
import { MainLayout } from '../../layouts/main-layout/main-layout';
import { DashboardPage } from './pages/dashboard-page/dashboard-page';
import { authGuard } from '../../core/guards/auth-guard';
import { UserRole } from '../../core/interfaces/auth-response';

const mainRoutes: Routes = [
  {
    path: '',
    component: MainLayout,
    canMatch: [authGuard],
    data: { roles: [UserRole.ADMINISTRADOR, UserRole.NUTRIOLOGO, UserRole.PACIENTE] },
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
        canMatch: [authGuard],
        data: { roles: [UserRole.ADMINISTRADOR] }
      },
      {
        path: 'alimentos',
        loadChildren: () => import('../alimentos/alimentos.routes').then(m => m.default),
        canMatch: [authGuard],
        data: { roles: [UserRole.ADMINISTRADOR, UserRole.NUTRIOLOGO] }
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      }
    ]
  }
];

export default mainRoutes;
