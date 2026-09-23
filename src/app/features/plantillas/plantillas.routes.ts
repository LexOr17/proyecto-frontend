import { Routes } from '@angular/router';

const plantillasRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-plantillas/lista-plantillas').then((m) => m.ListaPlantillas),
    title: 'Plantillas',
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./pages/registro-plantilla/registro-plantilla').then((m) => m.RegistroPlantilla),
    title: 'Nueva Plantilla',
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/editar-plantilla/editar-plantilla').then((m) => m.EditarPlantilla),
    title: 'Editar Plantilla',
  },
];

export default plantillasRoutes;
