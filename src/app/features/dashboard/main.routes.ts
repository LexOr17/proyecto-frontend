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
        path: 'pacientes',
        loadChildren: () => import('../pacientes/pacientes.routes').then(m => m.default),
        canMatch: [authGuard],
        data: { roles: [UserRole.NUTRIOLOGO] }
      },
      {
        path: 'alimentos',
        loadChildren: () => import('../alimentos/alimentos.routes').then(m => m.default),
        canMatch: [authGuard],
        data: { roles: [UserRole.ADMINISTRADOR, UserRole.NUTRIOLOGO] }
      },
      {
        path: 'plantillas',
        loadChildren: () => import('../plantillas/plantillas.routes').then(m => m.default),
        canMatch: [authGuard],
        data: { roles: [UserRole.ADMINISTRADOR, UserRole.NUTRIOLOGO] }
      },
      {
        path: 'planes',
        loadChildren: () => import('../planes/planes.routes').then(m => m.default),
        canMatch: [authGuard],
        data: { roles: [UserRole.NUTRIOLOGO] }
      },
      {
        path: 'citas',
        loadChildren: () => import('../citas/citas.routes').then(m => m.citasNutriologoRoutes),
        canMatch: [authGuard],
        data: { roles: [UserRole.NUTRIOLOGO] }
      },
      {
        path: 'mis-citas',
        loadChildren: () => import('../citas/citas.routes').then(m => m.citasPacienteRoutes),
        canMatch: [authGuard],
        data: { roles: [UserRole.PACIENTE] }
      },
      {
        path: 'mis-planes',
        loadChildren: () => import('../planes/mis-planes.routes').then(m => m.default),
        canMatch: [authGuard],
        data: { roles: [UserRole.PACIENTE] }
      },
      {
        path: 'restauracion',
        loadChildren: () => import('../backup/backup.routes').then(m => m.backupRoutes),
        canMatch: [authGuard],
        data: { roles: [UserRole.ADMINISTRADOR] }
      },
      {
        path: 'chat',
        loadChildren: () => import('../chat/chat.routes').then(m => m.default),
        canMatch: [authGuard],
        data: { roles: [UserRole.NUTRIOLOGO, UserRole.PACIENTE] }
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      }
    ]
  }
];

export default mainRoutes;
