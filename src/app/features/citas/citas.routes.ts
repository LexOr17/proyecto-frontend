import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';
import { UserRole } from '../../core/interfaces/auth-response';

// ─── Nutriólogo routes ─────────────────────────────────────────────────────
const citasNutriologoRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-citas-nutriologo/lista-citas-nutriologo').then(
        (m) => m.ListaCitasNutriologo
      ),
    title: 'Mis Citas',
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./pages/registro-cita-nutriologo/registro-cita-nutriologo').then(
        (m) => m.RegistroCitaNutriologo
      ),
    title: 'Nueva Cita',
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/registro-cita-nutriologo/registro-cita-nutriologo').then(
        (m) => m.RegistroCitaNutriologo
      ),
    title: 'Editar Cita',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/detalle-cita-nutriologo/detalle-cita-nutriologo').then(
        (m) => m.DetalleCitaNutriologo
      ),
    title: 'Detalle de Cita',
  },
];

// ─── Paciente routes ───────────────────────────────────────────────────────
const citasPacienteRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/lista-citas-paciente/lista-citas-paciente').then(
        (m) => m.ListaCitasPaciente
      ),
    title: 'Mis Citas',
  },
  {
    path: 'solicitar',
    loadComponent: () =>
      import('./pages/solicitar-cita-paciente/solicitar-cita-paciente').then(
        (m) => m.SolicitarCitaPaciente
      ),
    title: 'Solicitar Cita',
  },
  {
    path: 'reprogramar/:id',
    loadComponent: () =>
      import('./pages/reprogramar-cita-paciente/reprogramar-cita-paciente').then(
        (m) => m.ReprogramarCitaPaciente
      ),
    title: 'Reprogramar Cita',
  },
];

export { citasNutriologoRoutes, citasPacienteRoutes };
