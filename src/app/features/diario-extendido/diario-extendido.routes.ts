import { Routes } from '@angular/router';

const diarioExtendidoNutriologoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/diario-extendido-nutriologo/diario-extendido-nutriologo').then(
        m => m.DiarioExtendidoNutriologo,
      ),
    title: 'Bienestar de Pacientes',
  },
  {
    path: 'paciente/:pacienteId',
    loadComponent: () =>
      import('./pages/diario-extendido-nutriologo/diario-extendido-nutriologo').then(
        m => m.DiarioExtendidoNutriologo,
      ),
    title: 'Historial de Bienestar',
  },
];

const diarioExtendidoAdminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/diario-extendido-admin/diario-extendido-admin').then(
        m => m.DiarioExtendidoAdmin,
      ),
    title: 'Auditoría de Diarios',
  },
];

export { diarioExtendidoNutriologoRoutes, diarioExtendidoAdminRoutes };
