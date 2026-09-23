import { Routes } from '@angular/router';
import { ListaAlimentos } from './pages/lista-alimentos/lista-alimentos';
import { RegistroAlimentos } from './pages/registro-alimentos/registro-alimentos';

const alimentosRoutes: Routes = [
  {
    path: '',
    component: ListaAlimentos,
    title: 'Alimentos',
  },
  {
    path: 'nuevo',
    component: RegistroAlimentos,
    title: 'Nuevo Alimento',
  },
  {
    path: 'editar/:id',
    component: RegistroAlimentos,
    title: 'Editar Alimento',
  },
];

export default alimentosRoutes;
