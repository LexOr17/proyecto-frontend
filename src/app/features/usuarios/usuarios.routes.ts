import { Routes } from '@angular/router';
import { RegistroUsuarios } from './pages/registro-usuarios/registro-usuarios';
import { ListaUsuarios } from './pages/lista-usuarios/lista-usuarios';

const usuariosRoutes: Routes = [
  {
    path: '',
    component: RegistroUsuarios,
  },
  {
    path: 'usuarios',
    component: ListaUsuarios
  }
];

export default usuariosRoutes;
