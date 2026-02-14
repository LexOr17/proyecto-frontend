import { Routes } from '@angular/router';
import { AuthLayout } from '../../layouts/auth-layout/auth-layout';
import { LoginPage } from './pages/login-page/login-page';
import { PasswordPage } from './pages/password-page/password-page';

const authRoutes: Routes = [
    {
        path: '',
        component: AuthLayout,
        children: [
            {
                path: '',
                redirectTo: 'login',
                pathMatch: 'full',
            },
            {
                path: 'login',
                component: LoginPage,
                title: 'Iniciar Sesión',
            },
            {
                path: 'recuperar-password', 
                component: PasswordPage,
                title: 'Recuperar Contraseña',
            },
            {
                path: '**',
                redirectTo: 'login',
            },
        ],
    },
];

export default authRoutes;