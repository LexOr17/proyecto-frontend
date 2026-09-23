import { Routes } from '@angular/router';

const sugerenciasRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/sugerencias-nutriologo/sugerencias-nutriologo').then(
        (m) => m.SugerenciasNutriologo
      ),
    title: 'Sugerencias de Pacientes',
  },
  {
    path: 'revisar/:id',
    loadComponent: () =>
      import('./pages/revisar-sugerencia/revisar-sugerencia').then(
        (m) => m.RevisarSugerencia
      ),
    title: 'Revisar Sugerencia',
  },
];

export default sugerenciasRoutes;
