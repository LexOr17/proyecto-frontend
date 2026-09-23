import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../../service/dashboard.service';
import { AuthService } from '../../../../core/services/auth-service';
import { CitaResponse } from '../../../citas/interfaces/cita.interface';
import { MetaStatusCount } from '../../../metas/interfaces/meta.interface';

@Component({
  selector: 'app-nutriologo-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './nutriologo-dashboard.html',
  styleUrl: './nutriologo-dashboard.css'
})
export class NutriologoDashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly authService = inject(AuthService);

  citas = signal<CitaResponse[]>([]);
  totalPacientes = signal(0);
  loading = signal(true);
  today = new Date();

  // Computed stats
  readonly nutriologoId = computed(() => this.authService.userId());

  readonly citasPendientes = computed(() =>
    this.citas().filter((c) =>
      ['SOLICITADA', 'REPROGRAMACION_SOLICITADA', 'CANCELACION_SOLICITADA'].includes(c.estado)
    ).length
  );

  readonly citasHoy = computed(() => {
    const hoy = new Date().toDateString();
    return this.citas().filter((c) => new Date(c.fechaHoraInicio).toDateString() === hoy).length;
  });

  readonly citasProgramadas = computed(() =>
    this.citas().filter((c) => c.estado === 'PROGRAMADA').length
  );

  readonly proximasCitas = computed(() => {
    const ahora = new Date();
    return this.citas()
      .filter((c) => new Date(c.fechaHoraInicio) >= ahora && c.estado === 'PROGRAMADA')
      .sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime())
      .slice(0, 5);
  });

  readonly totalCitas = computed(() => this.citas().length);

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    const id = this.nutriologoId();
    if (!id) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      citas: this.dashboardService.getCitasNutriologo(id).pipe(catchError(() => of(null))),
      pacientes: this.dashboardService.getPacientesNutriologo(0, 5).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ citas, pacientes }) => {
        this.citas.set(citas?.datos ?? []);
        this.totalPacientes.set(pacientes?.datos?.totalElements ?? pacientes?.totalElements ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'Programada',
      SOLICITADA: 'Solicitada',
      CANCELADA: 'Cancelada',
      ASISTIO: 'Asistió',
      NO_ASISTIO: 'No Asistió',
      CANCELACION_SOLICITADA: 'Cancel. Solicitada',
      REPROGRAMACION_SOLICITADA: 'Reprog. Solicitada',
    };
    return map[estado] ?? estado;
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      PROGRAMADA: 'estado--programada',
      SOLICITADA: 'estado--solicitada',
      CANCELADA: 'estado--cancelada',
      ASISTIO: 'estado--asistio',
      NO_ASISTIO: 'estado--no-asistio',
      CANCELACION_SOLICITADA: 'estado--cancelacion',
      REPROGRAMACION_SOLICITADA: 'estado--reprog',
    };
    return map[estado] ?? '';
  }

  getMotivoLabel(motivo: string): string {
    const map: Record<string, string> = {
      PRIMERA_VEZ: 'Primera vez',
      SEGUIMIENTO: 'Seguimiento',
      REVISION_DE_PLAN: 'Revisión de plan',
      NUEVO_SINTOMA: 'Nuevo síntoma',
      CONTROL_MENSUAL: 'Control mensual',
      OTRO: 'Otro',
    };
    return map[motivo] ?? motivo;
  }
}
