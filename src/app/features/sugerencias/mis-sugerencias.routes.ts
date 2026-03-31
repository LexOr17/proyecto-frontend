import { Routes } from '@angular/router';

const misSugerenciasRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/mis-sugerencias/mis-sugerencias').then(
        (m) => m.MisSugerencias
      ),
    title: 'Mis Sugerencias',
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./pages/nueva-sugerencia/nueva-sugerencia').then(
        (m) => m.NuevaSugerencia
      ),
    title: 'Nueva Sugerencia',
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/editar-sugerencia/editar-sugerencia').then(
        (m) => m.EditarSugerencia
      ),
    title: 'Editar Sugerencia',
  },
];
export default misSugerenciasRoutes;
