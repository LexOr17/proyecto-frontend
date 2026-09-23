import { Routes } from '@angular/router';

const misDiarioExtendidoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/diario-extendido-paciente/diario-extendido-paciente').then(
        m => m.DiarioExtendidoPaciente,
      ),
    title: 'Mi Bienestar Diario',
  },
];

export default misDiarioExtendidoRoutes;
