import { Routes } from '@angular/router';

const metasNutriologoRoutes: Routes = [
  {
    path: ':pacienteId',
    loadComponent: () =>
      import('./pages/metas-nutriologo/metas-nutriologo').then(m => m.MetasNutriologo),
    title: 'Metas del Paciente',
  },
];

const metasPacienteRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/mis-metas/mis-metas').then(m => m.MisMetas),
    title: 'Mis Metas',
  },
];

export { metasNutriologoRoutes, metasPacienteRoutes };
