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
import { MetaResponse } from '../../../metas/interfaces/meta.interface';
import { PlanAlimenticioResponse } from '../../../planes/interfaces/plan.interface';
import { UltimaMedida, MetaResumen } from '../../interfaces/dashboard.interfaces';

@Component({
  selector: 'app-paciente-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './paciente-dashboard.html',
  styleUrl: './paciente-dashboard.css'
})
export class PacienteDashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  readonly authService = inject(AuthService);
  readonly Math = Math;  // Para usar Math.min en el template

  loading = signal(true);
  today = new Date();

  // Signals de datos
  ultimaMedida = signal<UltimaMedida | null>(null);
  historialMedidas = signal<UltimaMedida[]>([]);
  citas = signal<CitaResponse[]>([]);
  metas = signal<MetaResponse[]>([]);
  metaResumen = signal<MetaResumen | null>(null);
  planActivo = signal<PlanAlimenticioResponse | null>(null);

  // Frases motivacionales
  readonly frases = [
    'Cada pequeño paso te acerca a tu mejor versión. 💪',
    'La consistencia es la clave del cambio duradero. 🌱',
    'Tu salud es la inversión más valiosa que puedes hacer. ❤️',
    'Un día a la vez, un hábito a la vez. 🎯',
    'Los grandes resultados vienen de pequeñas acciones diarias. 🌟',
  ];

  readonly fraseHoy = computed(() => {
    const idx = new Date().getDate() % this.frases.length;
    return this.frases[idx];
  });

  readonly pacienteId = computed(() => this.authService.userId());

  readonly pesoActual = computed(() => this.ultimaMedida()?.peso ?? null);

  readonly pesoDelta = computed(() => {
    const h = this.historialMedidas();
    if (h.length < 2) return null;
    const sorted = [...h].sort((a, b) => new Date(b.fechaMedicion).getTime() - new Date(a.fechaMedicion).getTime());
    const ultimo = sorted[0]?.peso ?? null;
    const anterior = sorted[1]?.peso ?? null;
    if (ultimo === null || anterior === null) return null;
    return +(ultimo - anterior).toFixed(1);
  });

  readonly proximaCita = computed(() => {
    const ahora = new Date();
    return this.citas()
      .filter((c) => new Date(c.fechaHoraInicio) >= ahora && ['PROGRAMADA', 'SOLICITADA'].includes(c.estado))
      .sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime())[0] ?? null;
  });

  readonly ultimasCitas = computed(() =>
    [...this.citas()]
      .sort((a, b) => new Date(b.fechaHoraInicio).getTime() - new Date(a.fechaHoraInicio).getTime())
      .slice(0, 4)
  );

  readonly metasActivas = computed(() =>
    this.metas().filter((m) => ['PENDIENTE', 'POR_VALIDAR'].includes(m.estado)).slice(0, 4)
  );

  readonly diasEnPrograma = computed(() => {
    const plan = this.planActivo();
    if (!plan?.fechaInicio) return 0;
    const inicio = new Date(plan.fechaInicio);
    const hoy = new Date();
    const diff = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  });

  readonly metasCumplidas = computed(() =>
    this.metas().filter((m) => m.estado === 'CUMPLIDA').length
  );

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    const id = this.pacienteId();
    if (!id) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      medida: this.dashboardService.getUltimaMedida(id).pipe(catchError(() => of(null))),
      historial: this.dashboardService.getHistorialMedidas(id).pipe(catchError(() => of(null))),
      citas: this.dashboardService.getCitasPaciente(id).pipe(catchError(() => of(null))),
      metasResumen: this.dashboardService.getResumenMetasPaciente(id).pipe(catchError(() => of(null))),
      metas: this.dashboardService.getMetasPaciente(id).pipe(catchError(() => of(null))),
      planes: this.dashboardService.getPlanesPaciente(id).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ medida, historial, citas, metasResumen, metas, planes }) => {
        if (medida?.datos) {
          this.ultimaMedida.set(medida.datos);
        }

        if (historial?.datos) {
          const sorted = [...historial.datos].sort(
            (a, b) => new Date(a.fechaMedicion).getTime() - new Date(b.fechaMedicion).getTime()
          );
          this.historialMedidas.set(sorted);
        }

        if (citas?.datos) {
          this.citas.set(citas.datos);
        }

        if (metasResumen?.datos) {
          const d = metasResumen.datos as any;
          this.metaResumen.set({
            total: d.total ?? 0,
            cumplidas: d.cumplidas ?? 0,
            pendientes: d.pendientes ?? 0,
            porValidar: d.porValidar ?? 0,
            porcentajeExito: d.porcentajeExito ?? d.porcentaje ?? (d.total > 0 ? (d.cumplidas / d.total) * 100 : 0),
          });
        }

        if (metas) {
          const listaMetas = metas.datos?.content ?? (Array.isArray(metas.datos) ? metas.datos : (metas.content ?? []));
          this.metas.set(listaMetas);
        }

        if (planes?.datos) {
          const planesList = planes.datos;
          if (planesList.length > 0) {
            const sortedPlanes = [...planesList].sort(
              (a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
            );
            this.planActivo.set(sortedPlanes[0]);
          }
        }

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getPorcentajeMeta(meta: MetaResponse): number {
    if (meta.estado === 'CUMPLIDA') return 100;
    if (meta.estado === 'NO_CUMPLIDA' || meta.estado === 'RECHAZADA') return 0;
    const today = new Date();
    const objetivo = new Date(meta.fechaObjetivo);
    if (today >= objetivo) return 99;
    return 40; // valor visual indicativo para pendientes
  }

  getEstadoLabel(estado: string): string {
    const m: Record<string, string> = {
      PROGRAMADA: 'Programada', SOLICITADA: 'Solicitada',
      CANCELADA: 'Cancelada', ASISTIO: 'Asistió', NO_ASISTIO: 'No Asistió',
      CANCELACION_SOLICITADA: 'Cancel. Solicitada', REPROGRAMACION_SOLICITADA: 'Reprog.',
    };
    return m[estado] ?? estado;
  }

  getEstadoClass(estado: string): string {
    const m: Record<string, string> = {
      PROGRAMADA: 'estado--prog', SOLICITADA: 'estado--sol',
      CANCELADA: 'estado--can', ASISTIO: 'estado--ok', NO_ASISTIO: 'estado--no',
    };
    return m[estado] ?? '';
  }

  getCircumference(): number { return 2 * Math.PI * 28; }

  getDashOffset(pct: number): number {
    const c = this.getCircumference();
    return c - (pct / 100) * c;
  }
}
