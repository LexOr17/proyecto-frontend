import { Routes } from '@angular/router';
import { RegistroUsuarios } from './pages/registro-usuarios/registro-usuarios';
import { ListaUsuarios } from './pages/lista-usuarios/lista-usuarios';
const usuariosRoutes: Routes = [
  {
    path: '',
    component: ListaUsuarios,
    title: 'Usuarios',
  },
  {
    path: 'nuevo',
    component: RegistroUsuarios,
    title: 'Nuevo Usuario',
  },
  {
    path: 'editar/:id',
    component: RegistroUsuarios,
    title: 'Editar Usuario',
  }
];

export default usuariosRoutes;
