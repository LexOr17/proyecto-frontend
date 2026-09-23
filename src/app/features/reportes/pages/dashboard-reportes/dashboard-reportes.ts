import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ReporteService } from '../../service/reporte.service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { UsuarioService } from '../../../usuarios/service/usuario-service';
import { AuthService } from '../../../../core/services/auth-service';
import { Paciente } from '../../../pacientes/interfaces/paciente.interface';
import {
  AlimentoFrecuente,
  AlimentoSustituido,
  ReporteAsistencia,
  ReporteDesempenoNutriologo,
  ReporteProgreso,
  ReportePropuestaPlan,
  ReporteSeguimientoPlan,
} from '../../interfaces/reporte.interface';
import { Chart } from 'chart.js/auto';
import html2pdf from 'html2pdf.js';

export type ReportTabType =
  | 'progreso'
  | 'demografico'
  | 'adherencia'
  | 'asistencia'
  | 'desempeno'
  | 'propuesta';

export interface ReportTabItem {
  id: ReportTabType;
  title: string;
  subtitle: string;
  icon: string;
  badge?: string;
  badgeType?: 'a' | 'b' | 'c' | 'd' | 'e';
  isUpcoming?: boolean;
}

@Component({
  selector: 'app-dashboard-reportes',
  imports: [CommonModule, DecimalPipe, FormsModule],
  templateUrl: './dashboard-reportes.html',
  styleUrl: './dashboard-reportes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardReportes {
  private readonly reporteService = inject(ReporteService);
  private readonly pacienteService = inject(PacienteService);
  private readonly usuarioService = inject(UsuarioService);
  protected readonly authService = inject(AuthService);

  // Roles
  protected readonly isAdmin = computed(() => this.authService.currentUserRole() === 'ADMINISTRADOR');
  protected readonly isNutriologo = computed(() => this.authService.currentUserRole() === 'NUTRIOLOGO');

  // Catálogo de nutriólogos para filtro del administrador
  protected readonly nutriologosResource = rxResource({
    stream: () => (this.isAdmin() ? this.usuarioService.obtenerNutriologos() : of([])),
  });
  protected readonly nutriologosList = computed(() => this.nutriologosResource.value() ?? []);

  // Reporte activo
  protected readonly activeTab = signal<ReportTabType>('progreso');

  // Catálogo de pestañas según rol con semántica Nutri-Score
  protected readonly reportTabs = computed((): ReportTabItem[] => {
    if (this.isAdmin()) {
      return [
        {
          id: 'demografico',
          title: 'Censo y Demografía de Pacientes',
          subtitle: 'Distribución poblacional, género, grupos de edad y especialistas',
          icon: 'bx-pie-chart-alt-2',
          badge: 'Administración',
          badgeType: 'b',
        },
        {
          id: 'progreso',
          title: 'Evolución de Pacientes',
          subtitle: 'Historial de evaluaciones, peso corporal, % grasa, ICT e ICC',
          icon: 'bx-trending-up',
          badge: 'Activo',
          badgeType: 'a',
        },
        {
          id: 'adherencia',
          title: 'Seguimiento del Plan Alimenticio',
          subtitle: 'Cumplimiento de objetivos, apego dietético y días de desviación',
          icon: 'bx-food-menu',
          badge: 'Activo',
          badgeType: 'a',
        },
        {
          id: 'asistencia',
          title: 'Análisis de Asistencia y Demanda de Servicios',
          subtitle: 'Tasa de asistencia, cancelaciones y demanda de consultas',
          icon: 'bx-calendar-check',
          badge: 'Activo',
          badgeType: 'a',
        },
        {
          id: 'desempeno',
          title: 'Desempeño y Atención del Nutriólogo',
          subtitle: 'Carga clínica, eficiencia de agenda, prescripción y aportación a la base de datos',
          icon: 'bx-briefcase-alt-2',
          badge: 'Especialista',
          badgeType: 'b',
        },
        {
          id: 'propuesta',
          title: 'Receptividad y Propuestas de Plan',
          subtitle: 'Tasa de cambios, razones principales, alimentos problemáticos y perfil de pacientes',
          icon: 'bx-conversation',
          badge: 'Receptividad',
          badgeType: 'a',
        },
      ];
    }

    // Para Nutriólogo
    return [
      {
        id: 'progreso',
        title: 'Evolución de Pacientes',
        subtitle: 'Historial de evaluaciones, peso, grasa corporal y medidas corporales',
        icon: 'bx-trending-up',
        badge: 'Activo',
        badgeType: 'a',
      },
      {
        id: 'adherencia',
        title: 'Seguimiento del Plan Alimenticio',
        subtitle: 'Cumplimiento de objetivos, apego a comidas y días de desviación',
        icon: 'bx-food-menu',
        badge: 'Activo',
        badgeType: 'a',
      },
      {
        id: 'asistencia',
        title: 'Análisis de Asistencia y Demanda de Servicios',
        subtitle: 'Tasa de asistencia, cancelaciones y demanda de consultas',
        icon: 'bx-calendar-check',
        badge: 'Activo',
        badgeType: 'a',
      },
      {
        id: 'desempeno',
        title: 'Desempeño y Actividad Profesional',
        subtitle: 'Mi carga clínica, eficiencia de agenda, alimentos prescritos y aportación',
        icon: 'bx-briefcase-alt-2',
        badge: 'Autoevaluación',
        badgeType: 'a',
      },
      {
        id: 'propuesta',
        title: 'Receptividad y Propuestas de Plan',
        subtitle: 'Comunicación proactiva, tasa de cambio, motivos, sustituciones y perfil de pacientes',
        icon: 'bx-conversation',
        badge: 'Comunicación',
        badgeType: 'a',
      },
    ];
  });

  // Selector de Paciente (Buscador reactivo sin ID manual)
  protected readonly searchTerm = signal<string>('');
  protected readonly selectedPaciente = signal<Paciente | null>(null);

  protected readonly fechaActual = new Date();

  // Estados de exportación a PDF
  protected readonly isExportingProgreso = signal(false);
  protected readonly isExportingDemografico = signal(false);
  protected readonly isExportingSeguimiento = signal(false);
  protected readonly isExportingAsistencia = signal(false);
  protected readonly isExportingDesempeno = signal(false);
  protected readonly isExportingPropuesta = signal(false);

  // Helper de fecha máxima (hoy en ISO)
  protected readonly hoyIso = computed(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // ─── Filtros de periodo para Propuesta de Plan (Receptividad) ─────────────
  protected readonly periodoTipoPropuesta = signal<'mes' | 'trimestre' | 'semana' | 'personalizado'>('mes');
  protected readonly fechaInicioPropuesta = signal<string>('');
  protected readonly fechaFinPropuesta = signal<string>('');
  // Selector de nutriólogo para el administrador
  protected readonly nutriologoIdFiltroPropuesta = signal<number | null>(null);

  protected readonly errorFechasPropuesta = computed(() => {
    if (this.periodoTipoPropuesta() !== 'personalizado') return null;
    const ini = this.fechaInicioPropuesta();
    const fn = this.fechaFinPropuesta();
    if (ini && fn && ini > fn) {
      return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
    }
    return null;
  });

  protected readonly periodoFechasPropuesta = computed(() => {
    const tipo = this.periodoTipoPropuesta();
    const hoy = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];
    if (tipo === 'semana') {
      const h7 = new Date(); h7.setDate(hoy.getDate() - 7);
      return { inicio: format(h7), fin: format(hoy), etiqueta: 'Últimos 7 días' };
    } else if (tipo === 'mes') {
      const h30 = new Date(); h30.setDate(hoy.getDate() - 30);
      return { inicio: format(h30), fin: format(hoy), etiqueta: 'Últimos 30 días' };
    } else if (tipo === 'trimestre') {
      const h90 = new Date(); h90.setDate(hoy.getDate() - 90);
      return { inicio: format(h90), fin: format(hoy), etiqueta: 'Último Trimestre (90 días)' };
    } else {
      const ini = this.fechaInicioPropuesta();
      const fn  = this.fechaFinPropuesta();
      if (ini && fn && ini > fn) {
        return { inicio: undefined, fin: undefined, etiqueta: 'Rango de fechas inválido' };
      }
      return {
        inicio: ini || undefined,
        fin: fn || undefined,
        etiqueta: ini && fn ? `${ini} a ${fn}` : 'Periodo personalizado',
      };
    }
  });

  protected setPeriodoTipoPropuesta(tipo: 'mes' | 'trimestre' | 'semana' | 'personalizado'): void {
    this.periodoTipoPropuesta.set(tipo);
  }

  protected onNutriologoChangePropuesta(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    this.nutriologoIdFiltroPropuesta.set(val ? Number(val) : null);
  }

  // Imágenes PDF para Propuesta de Plan
  protected readonly razonesPropuestaChartImg       = signal<string | null>(null);
  protected readonly alimentosProblematicosChartImg = signal<string | null>(null);
  protected readonly perfilPacientesChartImg        = signal<string | null>(null);
  protected readonly plantillasPropuestaChartImg    = signal<string | null>(null);

  // ─── Filtros de periodo para Desempeño ────────────────────────────────────
  protected readonly periodoTipoDesempeno = signal<'mes' | 'trimestre' | 'semana' | 'personalizado'>('mes');
  protected readonly fechaInicioDesempeno = signal<string>('');
  protected readonly fechaFinDesempeno = signal<string>('');
  // Selector de nutriólogo para el administrador
  protected readonly nutriologoIdFiltroDesempeno = signal<number | null>(null);

  protected readonly errorFechasDesempeno = computed(() => {
    if (this.periodoTipoDesempeno() !== 'personalizado') return null;
    const ini = this.fechaInicioDesempeno();
    const fn = this.fechaFinDesempeno();
    if (ini && fn && ini > fn) {
      return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
    }
    return null;
  });

  protected readonly periodoFechasDesempeno = computed(() => {
    const tipo = this.periodoTipoDesempeno();
    const hoy = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];
    if (tipo === 'semana') {
      const h7 = new Date(); h7.setDate(hoy.getDate() - 7);
      return { inicio: format(h7), fin: format(hoy), etiqueta: 'Últimos 7 días' };
    } else if (tipo === 'mes') {
      const h30 = new Date(); h30.setDate(hoy.getDate() - 30);
      return { inicio: format(h30), fin: format(hoy), etiqueta: 'Últimos 30 días' };
    } else if (tipo === 'trimestre') {
      const h90 = new Date(); h90.setDate(hoy.getDate() - 90);
      return { inicio: format(h90), fin: format(hoy), etiqueta: 'Último Trimestre (90 días)' };
    } else {
      const ini = this.fechaInicioDesempeno();
      const fn  = this.fechaFinDesempeno();
      if (ini && fn && ini > fn) {
        return { inicio: undefined, fin: undefined, etiqueta: 'Rango de fechas inválido' };
      }
      return {
        inicio: ini || undefined,
        fin: fn || undefined,
        etiqueta: ini && fn ? `${ini} a ${fn}` : 'Periodo personalizado',
      };
    }
  });

  protected setPeriodoTipoDesempeno(tipo: 'mes' | 'trimestre' | 'semana' | 'personalizado'): void {
    this.periodoTipoDesempeno.set(tipo);
  }

  protected onNutriologoChangeDesempeno(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    this.nutriologoIdFiltroDesempeno.set(val ? Number(val) : null);
  }

  // Imágenes PDF para Desempeño
  protected readonly topAlimentosChartImg       = signal<string | null>(null);
  protected readonly plantillasTipoChartImg     = signal<string | null>(null);
  protected readonly alimentosCategoriaChartImg = signal<string | null>(null);
  protected readonly distPrescripcionChartImg   = signal<string | null>(null);

  // ─── Filtros de periodo para Asistencia ───────────────────────────────────
  protected readonly periodoTipoAsistencia = signal<'mes' | 'semana' | 'personalizado'>('mes');
  protected readonly fechaInicioAsistencia = signal<string>('');
  protected readonly fechaFinAsistencia = signal<string>('');
  // Selector de nutriólogo para el administrador
  protected readonly nutriologoIdFiltroAsistencia = signal<number | null>(null);

  protected readonly errorFechasAsistencia = computed(() => {
    if (this.periodoTipoAsistencia() !== 'personalizado') return null;
    const ini = this.fechaInicioAsistencia();
    const fn = this.fechaFinAsistencia();
    if (ini && fn && ini > fn) {
      return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
    }
    return null;
  });

  protected readonly periodoFechasAsistencia = computed(() => {
    const tipo = this.periodoTipoAsistencia();
    const hoy = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];
    if (tipo === 'semana') {
      const h7 = new Date(); h7.setDate(hoy.getDate() - 7);
      return { inicio: format(h7), fin: format(hoy) };
    } else if (tipo === 'mes') {
      const h30 = new Date(); h30.setDate(hoy.getDate() - 30);
      return { inicio: format(h30), fin: format(hoy) };
    } else {
      const ini = this.fechaInicioAsistencia();
      const fn  = this.fechaFinAsistencia();
      if (ini && fn && ini > fn) {
        return { inicio: undefined, fin: undefined };
      }
      return { inicio: ini || undefined, fin: fn || undefined };
    }
  });

  protected setPeriodoTipoAsistencia(tipo: 'mes' | 'semana' | 'personalizado'): void {
    this.periodoTipoAsistencia.set(tipo);
  }

  // Imágenes PDF para asistencia
  protected readonly asistenciaChartImg   = signal<string | null>(null);
  protected readonly cancelacionChartImg  = signal<string | null>(null);
  protected readonly demandaChartImg      = signal<string | null>(null);

  // Filtros de periodo para Seguimiento del Plan
  protected readonly periodoTipo = signal<'mes' | 'semana' | 'personalizado'>('mes');
  protected readonly fechaInicioFiltro = signal<string>('');
  protected readonly fechaFinFiltro = signal<string>('');

  protected readonly errorFechasSeguimiento = computed(() => {
    if (this.periodoTipo() !== 'personalizado') return null;
    const ini = this.fechaInicioFiltro();
    const fn = this.fechaFinFiltro();
    if (ini && fn && ini > fn) {
      return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
    }
    return null;
  });

  protected readonly periodoFechas = computed(() => {
    const tipo = this.periodoTipo();
    const hoy = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];

    if (tipo === 'semana') {
      const hace7 = new Date();
      hace7.setDate(hoy.getDate() - 7);
      return { inicio: format(hace7), fin: format(hoy), etiqueta: 'Últimos 7 días' };
    } else if (tipo === 'mes') {
      const hace30 = new Date();
      hace30.setDate(hoy.getDate() - 30);
      return { inicio: format(hace30), fin: format(hoy), etiqueta: 'Últimos 30 días' };
    } else {
      const ini = this.fechaInicioFiltro();
      const fn = this.fechaFinFiltro();
      if (ini && fn && ini > fn) {
        return { inicio: undefined, fin: undefined, etiqueta: 'Rango de fechas inválido' };
      }
      return {
        inicio: ini || undefined,
        fin: fn || undefined,
        etiqueta: ini && fn ? `${ini} a ${fn}` : 'Periodo personalizado',
      };
    }
  });

  protected setPeriodoTipo(tipo: 'mes' | 'semana' | 'personalizado'): void {
    this.periodoTipo.set(tipo);
  }

  // Imágenes Base64 de alta resolución de gráficos
  protected readonly pesoChartImg = signal<string | null>(null);
  protected readonly grasaChartImg = signal<string | null>(null);
  protected readonly generoChartImg = signal<string | null>(null);
  protected readonly edadChartImg = signal<string | null>(null);
  protected readonly nutriologoChartImg = signal<string | null>(null);
  protected readonly metasChartImg = signal<string | null>(null);
  protected readonly apegoChartImg = signal<string | null>(null);
  protected readonly desviacionChartImg = signal<string | null>(null);

  // 1. Carga del censo demográfico (SOLO si es Administrador)
  protected readonly demograficoResource = rxResource({
    stream: () => (this.isAdmin() ? this.reporteService.obtenerReporteDemografico() : of(null)),
  });

  // 2. Carga de pacientes para el selector
  protected readonly pacientesResource = rxResource({
    stream: () => this.pacienteService.obtenerPacientes(0, 100),
  });

  protected readonly allPacientes = computed((): Paciente[] => {
    return this.pacientesResource.value()?.content ?? [];
  });

  protected readonly filteredPacientes = computed((): Paciente[] => {
    const term = this.searchTerm().toLowerCase().trim();
    const list = this.allPacientes();
    if (!term) return list;
    return list.filter(p => {
      const full = `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno ?? ''}`.toLowerCase();
      return (
        full.includes(term) ||
        (p.id && String(p.id).includes(term)) ||
        (p.correo && p.correo.toLowerCase().includes(term))
      );
    });
  });

  protected selectPaciente(p: Paciente): void {
    this.selectedPaciente.set(p);
  }

  protected cambiarPaciente(): void {
    this.selectedPaciente.set(null);
  }

  protected readonly pacienteIdSeleccionado = computed(() => this.selectedPaciente()?.id ?? null);

  // 3. Carga del reporte de progreso para el paciente seleccionado
  protected readonly progresoResource = rxResource({
    params: () => {
      const id = this.pacienteIdSeleccionado();
      return id ? { id } : undefined;
    },
    stream: ({ params }) => this.reporteService.obtenerReporteProgreso(params.id),
  });

  // 4. Carga del reporte de seguimiento del plan para el paciente seleccionado
  protected readonly seguimientoPlanResource = rxResource({
    params: () => {
      const id = this.pacienteIdSeleccionado();
      const p = this.periodoFechas();
      return id ? { id, inicio: p.inicio, fin: p.fin } : undefined;
    },
    stream: ({ params }) =>
      this.reporteService.obtenerReporteSeguimientoPlan(params.id, params.inicio, params.fin),
  });

  // 5. Carga del reporte de asistencia
  protected readonly asistenciaResource = rxResource({
    params: () => {
      const p    = this.periodoFechasAsistencia();
      const nId  = this.nutriologoIdFiltroAsistencia();
      return { inicio: p.inicio, fin: p.fin, nutriologoId: nId };
    },
    stream: ({ params }) =>
      this.reporteService.obtenerReporteAsistencia(params.nutriologoId, params.inicio, params.fin),
  });

  // 6. Carga del reporte de desempeño y atención del nutriólogo
  protected readonly desempenoResource = rxResource({
    params: () => {
      const p   = this.periodoFechasDesempeno();
      const nId = this.nutriologoIdFiltroDesempeno();
      return { inicio: p.inicio, fin: p.fin, nutriologoId: nId };
    },
    stream: ({ params }) =>
      this.reporteService.obtenerReporteDesempenoNutriologo(params.nutriologoId, params.inicio, params.fin),
  });

  // 7. Carga del reporte de propuesta de plan y receptividad
  protected readonly propuestaPlanResource = rxResource({
    params: () => {
      const p   = this.periodoFechasPropuesta();
      const nId = this.nutriologoIdFiltroPropuesta();
      return { inicio: p.inicio, fin: p.fin, nutriologoId: nId };
    },
    stream: ({ params }) =>
      this.reporteService.obtenerReportePropuestaPlan(params.nutriologoId, params.inicio, params.fin),
  });

  // Instancias de Chart.js
  private generoChart: any = null;
  private edadChart: any = null;
  private nutriologoChart: any = null;
  private pesoChart: any = null;
  private grasaChart: any = null;
  private metasChart: any = null;
  private apegoChart: any = null;
  private desviacionChart: any = null;
  private asistenciaChart: any = null;
  private cancelacionChart: any = null;
  private demandaChart: any = null;
  private topAlimentosChart: any = null;
  private plantillasTipoChart: any = null;
  private alimentosCategoriaChart: any = null;
  private distPrescripcionChart: any = null;
  private razonesPropuestaChart: any = null;
  private alimentosProblematicosChart: any = null;
  private perfilPacientesChart: any = null;
  private plantillasPropuestaChart: any = null;

  constructor() {
    if (this.authService.currentUserRole() === 'ADMINISTRADOR') {
      this.activeTab.set('demografico');
    }

    // Efecto reactivo para gráficos demográficos
    effect(() => {
      const tab = this.activeTab();
      const r = this.demograficoResource.value();
      if (tab === 'demografico' && r) {
        setTimeout(() => {
          this.inicializarGraficosDemograficos(r);
        }, 80);
      }
    });

    // Efecto reactivo para gráficos de progreso clínico
    effect(() => {
      const tab = this.activeTab();
      const p = this.progresoResource.value();
      if (tab === 'progreso' && p && p.fechas && p.fechas.length > 0) {
        setTimeout(() => {
          this.inicializarGraficosProgreso(p);
        }, 80);
      }
    });

    // Efecto reactivo para gráficos de seguimiento del plan
    effect(() => {
      const tab = this.activeTab();
      const s = this.seguimientoPlanResource.value();
      if (tab === 'adherencia' && s) {
        setTimeout(() => {
          this.inicializarGraficosSeguimiento(s);
        }, 80);
      }
    });

    // Efecto reactivo para gráficos de asistencia
    effect(() => {
      const tab = this.activeTab();
      const a = this.asistenciaResource.value();
      if (tab === 'asistencia' && a) {
        setTimeout(() => {
          this.inicializarGraficosAsistencia(a);
        }, 80);
      }
    });

    // Efecto reactivo para gráficos de desempeño del nutriólogo
    effect(() => {
      const tab = this.activeTab();
      const d = this.desempenoResource.value();
      if (tab === 'desempeno' && d) {
        setTimeout(() => {
          this.inicializarGraficosDesempeno(d);
        }, 80);
      }
    });

    // Efecto reactivo para gráficos de propuesta de plan y receptividad
    effect(() => {
      const tab = this.activeTab();
      const p = this.propuestaPlanResource.value();
      if (tab === 'propuesta' && p) {
        setTimeout(() => {
          this.inicializarGraficosPropuesta(p);
        }, 80);
      }
    });
  }

  protected setTab(tab: ReportTabType): void {
    this.activeTab.set(tab);
  }

  // ─── INICIALIZACIÓN GRÁFICOS DEMOGRÁFICOS (CHART.JS - PALETA NUTRI-SCORE) ───────────

  private inicializarGraficosDemograficos(data: any): void {
    if (!data) return;

    // 1. Gráfico de Género (Donut con Escala Nutri-Score)
    const ctxGenero = document.getElementById('canvas-genero') as HTMLCanvasElement;
    if (ctxGenero && data.distribucionPorGenero) {
      this.generoChart?.destroy();

      const labels = Object.keys(data.distribucionPorGenero).map(key => {
        if (key === 'MASCULINO') return 'Hombres';
        if (key === 'FEMENINO') return 'Mujeres';
        return 'Otro';
      });
      const values = Object.values(data.distribucionPorGenero);

      this.generoChart = new Chart(ctxGenero, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#e63e11'],
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { family: 'inherit', size: 11, weight: 'bold' },
              },
            },
          },
        },
      });
    }

    // 2. Gráfico de Rango de Edad (Barras Verde Lima Nutri-Score B)
    const ctxEdad = document.getElementById('canvas-edad') as HTMLCanvasElement;
    if (ctxEdad && data.distribucionPorRangoEdad) {
      this.edadChart?.destroy();

      const labels = Object.keys(data.distribucionPorRangoEdad).map(k => `${k} años`);
      const values = Object.values(data.distribucionPorRangoEdad);

      this.edadChart = new Chart(ctxEdad, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Pacientes',
              data: values,
              backgroundColor: 'rgba(133, 187, 47, 0.85)',
              hoverBackgroundColor: '#85bb2f',
              borderRadius: 6,
              borderWidth: 0,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { grid: { display: false }, ticks: { precision: 0 } },
            y: { grid: { display: false } },
          },
        },
      });
    }

    // 3. Gráfico por Nutriólogo (Barras Verde Oscuro Nutri-Score A)
    const ctxNutri = document.getElementById('canvas-nutriologo') as HTMLCanvasElement;
    if (ctxNutri && data.distribucionPorNutriologo) {
      this.nutriologoChart?.destroy();

      const labels = Object.keys(data.distribucionPorNutriologo);
      const values = Object.values(data.distribucionPorNutriologo);

      this.nutriologoChart = new Chart(ctxNutri, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Pacientes',
              data: values,
              backgroundColor: 'rgba(3, 129, 65, 0.85)',
              hoverBackgroundColor: '#038141',
              borderRadius: 6,
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { display: false }, ticks: { precision: 0 } },
          },
        },
      });
    }
  }

  // ─── INICIALIZACIÓN GRÁFICOS DE PROGRESO (CHART.JS - PALETA NUTRI-SCORE) ───────────

  private inicializarGraficosProgreso(progreso: any): void {
    if (!progreso || !progreso.fechas) return;
    const fechasFormateadas = progreso.fechas.map((f: string) => f.substring(5, 10).replace('-', '/'));

    // 1. Gráfico de Peso (Verde Nutri-Score A #038141 con degradado #85bb2f)
    const ctxPeso = document.getElementById('canvas-peso') as HTMLCanvasElement;
    if (ctxPeso) {
      this.pesoChart?.destroy();

      this.pesoChart = new Chart(ctxPeso, {
        type: 'line',
        data: {
          labels: fechasFormateadas,
          datasets: [
            {
              label: 'Peso (kg)',
              data: progreso.pesos,
              borderColor: '#038141',
              backgroundColor: 'rgba(133, 187, 47, 0.15)',
              borderWidth: 3,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#038141',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f1f5f9' } },
          },
        },
      });
    }

    // 2. Gráfico de Porcentaje de Grasa (Naranja Nutri-Score D #ee8100 con degradado #fecb02)
    const ctxGrasa = document.getElementById('canvas-grasa') as HTMLCanvasElement;
    if (ctxGrasa) {
      this.grasaChart?.destroy();

      this.grasaChart = new Chart(ctxGrasa, {
        type: 'line',
        data: {
          labels: fechasFormateadas,
          datasets: [
            {
              label: 'Grasa (%)',
              data: progreso.porcentajesGrasa,
              borderColor: '#ee8100',
              backgroundColor: 'rgba(254, 203, 2, 0.15)',
              borderWidth: 3,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#ee8100',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 7,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f1f5f9' } },
          },
        },
      });
    }
  }

  // ─── INICIALIZACIÓN GRÁFICOS DE SEGUIMIENTO (CHART.JS - PALETA NUTRI-SCORE) ─────────

  private inicializarGraficosSeguimiento(data: ReporteSeguimientoPlan): void {
    if (!data) return;

    // 1. Gráfico de Cumplimiento de Objetivos
    const ctxMetas = document.getElementById('canvas-metas') as HTMLCanvasElement;
    if (ctxMetas) {
      this.metasChart?.destroy();

      const hasMetas = data.totalMetas > 0;
      const labels = hasMetas
        ? ['Cumplidos', 'En Progreso', 'No Cumplidos']
        : ['Sin Objetivos Registrados'];
      const values = hasMetas
        ? [data.metasCumplidas, data.metasEnProgreso, data.metasNoCumplidas]
        : [1];
      const bgColors = hasMetas
        ? ['#038141', '#fecb02', '#e63e11']
        : ['#e2e8f0'];

      this.metasChart = new Chart(ctxMetas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: bgColors,
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { family: 'inherit', size: 11, weight: 'bold' },
              },
            },
          },
        },
      });
    }

    // 2. Gráfico de Desglose de Comidas y Apego (Donut Nutri-Score)
    const ctxApego = document.getElementById('canvas-apego') as HTMLCanvasElement;
    if (ctxApego) {
      this.apegoChart?.destroy();

      const hasRegistros = data.totalRegistros > 0;
      const labels = hasRegistros
        ? ['Cumplidas', 'Modificadas', 'Saltadas', 'No Registradas']
        : ['Sin Registros'];
      const values = hasRegistros
        ? [
            data.registrosCumplidos,
            data.registrosModificados,
            data.registrosSaltados,
            data.registrosNoRegistrados,
          ]
        : [1];
      const bgColors = hasRegistros
        ? ['#038141', '#fecb02', '#ee8100', '#94a3b8']
        : ['#e2e8f0'];

      this.apegoChart = new Chart(ctxApego, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: bgColors,
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { family: 'inherit', size: 11, weight: 'bold' },
              },
            },
          },
        },
      });
    }

    // 3. Gráfico de Días de Desviación (Barras por día de la semana)
    const ctxDesviacion = document.getElementById('canvas-desviacion') as HTMLCanvasElement;
    if (ctxDesviacion) {
      this.desviacionChart?.destroy();

      const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
      const mapaDesviacion = data.desviacionPorDia || {};

      const normalizar = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const values = diasSemana.map(dia => {
        const diaNorm = normalizar(dia);
        for (const [k, v] of Object.entries(mapaDesviacion)) {
          if (normalizar(k) === diaNorm) return v;
        }
        return 0;
      });

      this.desviacionChart = new Chart(ctxDesviacion, {
        type: 'bar',
        data: {
          labels: diasSemana,
          datasets: [
            {
              label: 'Comidas Modificadas o Saltadas',
              data: values,
              backgroundColor: 'rgba(238, 129, 0, 0.85)',
              hoverBackgroundColor: '#ee8100',
              borderRadius: 6,
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f1f5f9' }, ticks: { precision: 0 } },
          },
        },
      });
    }
  }

  // ─── GENERACIÓN DE PDF PROFESIONAL DE ALTA RESOLUCIÓN ──────────────────────────────

  protected async descargarPDFProgreso(): Promise<void> {
    if (this.isExportingProgreso()) return;
    const data = this.progresoResource.value();
    if (!data || !data.fechas || data.fechas.length === 0) return;

    const pesoImg = this.renderizarGraficoOffscreen(
      'line',
      {
        labels: data.fechas,
        datasets: [
          {
            label: 'Peso (kg)',
            data: data.pesos,
            borderColor: '#047857',
            backgroundColor: 'rgba(4, 120, 87, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#047857',
            borderWidth: 2,
          },
        ],
      },
      {
        layout: { padding: { top: 10, bottom: 6, left: 6, right: 12 } },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9, weight: 'bold' }, color: '#475569' } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9, weight: 'bold' }, color: '#475569' } },
        },
      },
      500,
      240
    );

    const grasaImg = this.renderizarGraficoOffscreen(
      'line',
      {
        labels: data.fechas,
        datasets: [
          {
            label: '% Grasa',
            data: data.porcentajesGrasa,
            borderColor: '#65a30d',
            backgroundColor: 'rgba(101, 163, 13, 0.12)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#65a30d',
            borderWidth: 2,
          },
        ],
      },
      {
        layout: { padding: { top: 10, bottom: 6, left: 6, right: 12 } },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9, weight: 'bold' }, color: '#475569' } },
          y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 9, weight: 'bold' }, color: '#475569' } },
        },
      },
      500,
      240
    );

    this.pesoChartImg.set(pesoImg);
    this.grasaChartImg.set(grasaImg);
    this.isExportingProgreso.set(true);

    const nombre = (this.selectedPaciente()?.nombre || 'Paciente').replace(/\s+/g, '_');
    const apellido = (this.selectedPaciente()?.apellidoPaterno || '').replace(/\s+/g, '_');

    await new Promise((r) => setTimeout(r, 300));
    const element = document.getElementById('clinical-pdf-progreso');
    if (!element) {
      this.isExportingProgreso.set(false);
      return;
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `informe_evolucion_${nombre}_${apellido}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2.2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 734,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().from(element).set(opt as any).save();
    } finally {
      this.isExportingProgreso.set(false);
      this.pesoChartImg.set(null);
      this.grasaChartImg.set(null);
    }
  }

  protected async descargarPDFDemografico(): Promise<void> {
    if (!this.isAdmin() || this.isExportingDemografico()) return;
    const data = this.demograficoResource.value();
    if (!data) return;

    // 1. Género Donut
    const genEntries = Object.entries(data.distribucionPorGenero || {});
    const generoImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: genEntries.map(([k]) => (k === 'MASCULINO' ? 'Masculino' : k === 'FEMENINO' ? 'Femenino' : 'Otro')),
        datasets: [
          {
            data: genEntries.map(([, v]) => v),
            backgroundColor: ['#047857', '#65a30d', '#cbd5e1'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 8, font: { size: 9, weight: 'bold' }, color: '#1e293b' },
          },
        },
      },
      500,
      260
    );

    // 2. Edad Bar
    const edadEntries = Object.entries(data.distribucionPorRangoEdad || {});
    const edadImg = this.renderizarGraficoOffscreen(
      'bar',
      {
        labels: edadEntries.map(([k]) => k),
        datasets: [
          {
            label: 'Pacientes',
            data: edadEntries.map(([, v]) => v),
            backgroundColor: '#85bb2f',
            borderRadius: 6,
          },
        ],
      },
      {
        indexAxis: 'y',
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 28 } },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            grace: '15%',
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 9, weight: 'bold' }, precision: 0 },
          },
          y: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } },
        },
      },
      500,
      260
    );

    // 3. Nutriólogo Bar Full-width
    const nutriEntries = Object.entries(data.distribucionPorNutriologo || {});
    const nutriologoImg = this.renderizarGraficoOffscreen(
      'bar',
      {
        labels: nutriEntries.map(([k]) => k),
        datasets: [
          {
            label: 'Pacientes Asignados',
            data: nutriEntries.map(([, v]) => v),
            backgroundColor: '#038141',
            borderRadius: 6,
          },
        ],
      },
      {
        layout: { padding: { top: 8, bottom: 6, left: 6, right: 8 } },
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grace: '15%',
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 9, weight: 'bold' }, precision: 0 },
          },
          x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } },
        },
      },
      700,
      240
    );

    this.generoChartImg.set(generoImg);
    this.edadChartImg.set(edadImg);
    this.nutriologoChartImg.set(nutriologoImg);
    this.isExportingDemografico.set(true);

    await new Promise((r) => setTimeout(r, 300));
    const element = document.getElementById('clinical-pdf-demografico');
    if (!element) {
      this.isExportingDemografico.set(false);
      return;
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: 'informe_censo_demografico.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2.2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 734,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().from(element).set(opt as any).save();
    } finally {
      this.isExportingDemografico.set(false);
      this.generoChartImg.set(null);
      this.edadChartImg.set(null);
      this.nutriologoChartImg.set(null);
    }
  }

  protected async descargarPDFSeguimiento(): Promise<void> {
    if (this.isExportingSeguimiento()) return;
    const data = this.seguimientoPlanResource.value();
    if (!data) return;

    // 1. Metas Donut
    const metasImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: ['Cumplidas', 'En Progreso', 'No Cumplidas'],
        datasets: [
          {
            data: [data.metasCumplidas, data.metasEnProgreso, data.metasNoCumplidas],
            backgroundColor: ['#047857', '#65a30d', '#dc2626'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 8, font: { size: 9, weight: 'bold' }, color: '#1e293b' },
          },
        },
      },
      500,
      260
    );

    // 2. Apego Donut
    const apegoImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: ['Cumplidas', 'Modificadas', 'Saltadas', 'No Registradas'],
        datasets: [
          {
            data: [
              data.registrosCumplidos,
              data.registrosModificados,
              data.registrosSaltados,
              data.registrosNoRegistrados,
            ],
            backgroundColor: ['#047857', '#eab308', '#dc2626', '#cbd5e1'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 8, font: { size: 9, weight: 'bold' }, color: '#1e293b' },
          },
        },
      },
      500,
      260
    );

    // 3. Desviacion Bar Full-width
    const desvEntries = Object.entries(data.desviacionPorDia || {});
    const desviacionImg = this.renderizarGraficoOffscreen(
      'bar',
      {
        labels: desvEntries.map(([k]) => k),
        datasets: [
          {
            label: 'Desviaciones / Ajustes',
            data: desvEntries.map(([, v]) => v),
            backgroundColor: '#eab308',
            borderRadius: 6,
          },
        ],
      },
      {
        layout: { padding: { top: 8, bottom: 6, left: 6, right: 8 } },
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grace: '15%',
            grid: { color: '#f1f5f9' },
            ticks: { font: { size: 9, weight: 'bold' }, precision: 0 },
          },
          x: { grid: { display: false }, ticks: { font: { size: 9, weight: 'bold' } } },
        },
      },
      700,
      240
    );

    this.metasChartImg.set(metasImg);
    this.apegoChartImg.set(apegoImg);
    this.desviacionChartImg.set(desviacionImg);
    this.isExportingSeguimiento.set(true);

    const nombre = (this.selectedPaciente()?.nombre || 'Paciente').replace(/\s+/g, '_');
    const apellido = (this.selectedPaciente()?.apellidoPaterno || '').replace(/\s+/g, '_');

    await new Promise((r) => setTimeout(r, 300));
    const element = document.getElementById('clinical-pdf-seguimiento');
    if (!element) {
      this.isExportingSeguimiento.set(false);
      return;
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `informe_seguimiento_plan_${nombre}_${apellido}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2.2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 734,
        backgroundColor: '#ffffff',
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().from(element).set(opt as any).save();
    } finally {
      this.isExportingSeguimiento.set(false);
      this.metasChartImg.set(null);
      this.apegoChartImg.set(null);
      this.desviacionChartImg.set(null);
    }
  }

  // ─── AUXILIARES E INTERPRETACIÓN CLÍNICA (GUÍA DE AYUDA) ──────────────────────────

  protected readonly totalGeneros = computed(() => {
    const d = this.demograficoResource.value();
    return d && d.distribucionPorGenero ? Object.keys(d.distribucionPorGenero).length : 0;
  });

  protected readonly totalRangosEdad = computed(() => {
    const d = this.demograficoResource.value();
    return d && d.distribucionPorRangoEdad ? Object.keys(d.distribucionPorRangoEdad).length : 0;
  });

  // Estadísticas del paciente seleccionado (Progreso)
  protected readonly pacienteStats = computed(() => {
    const p = this.progresoResource.value();
    if (!p || !p.pesos || p.pesos.length === 0) return null;

    const inicial = p.pesos[0];
    const actual = p.pesos[p.pesos.length - 1];
    const diff = actual - inicial;

    const inicialGrasa = p.porcentajesGrasa?.[0] || 0;
    const actualGrasa = p.porcentajesGrasa?.[p.porcentajesGrasa.length - 1] || 0;
    const diffGrasa = actualGrasa - inicialGrasa;

    const ultimoICT = p.indicesCinturaTalla?.[p.indicesCinturaTalla.length - 1] || null;
    const ultimoICC = p.indicesCinturaCadera?.[p.indicesCinturaCadera.length - 1] || null;

    return {
      pesoInicial: inicial,
      pesoActual: actual,
      pesoDiferencia: diff,
      grasaInicial: inicialGrasa,
      grasaActual: actualGrasa,
      grasaDiferencia: diffGrasa,
      ultimoICT,
      ultimoICC,
      totalRegistros: p.fechas.length,
    };
  });

  // Resumen del día con mayor desviación
  protected readonly diaMayorDesviacion = computed(() => {
    const s = this.seguimientoPlanResource.value();
    if (!s || !s.desviacionPorDia) return { dia: 'Sin desviaciones', cantidad: 0 };
    let maxDia = 'Sin desviaciones';
    let maxVal = 0;
    for (const [dia, cant] of Object.entries(s.desviacionPorDia)) {
      if (cant > maxVal) {
        maxVal = cant;
        maxDia = dia;
      }
    }
    return { dia: maxVal > 0 ? maxDia : 'Sin desviaciones', cantidad: maxVal };
  });

  // Total de desviaciones acumuladas
  protected readonly totalDesviaciones = computed(() => {
    const s = this.seguimientoPlanResource.value();
    if (!s) return 0;
    return (s.registrosModificados || 0) + (s.registrosSaltados || 0);
  });

  // Interpretación del % de Grasa Corporal
  protected interpretacionGrasa(grasa: number | null | undefined, genero?: string): { score: string; nivel: string; color: string; desc: string } {
    if (!grasa) return { score: '-', nivel: 'Sin Datos', color: '#64748b', desc: 'No se registran suficientes datos de grasa corporal.' };
    const esHombre = genero === 'MASCULINO';

    if (esHombre) {
      if (grasa < 14) return { score: 'A', nivel: 'Atlético / Óptimo', color: '#038141', desc: 'Nivel óptimo de grasa corporal esencial y masa magra.' };
      if (grasa <= 20) return { score: 'B', nivel: 'Saludable', color: '#85bb2f', desc: 'Rango normal saludable para hombres adultos.' };
      if (grasa <= 25) return { score: 'C', nivel: 'Aceptable Moderado', color: '#fecb02', desc: 'Porcentaje aceptable con oportunidad de tonificación.' };
      if (grasa <= 30) return { score: 'D', nivel: 'Sobrepeso Graso', color: '#ee8100', desc: 'Exceso leve de tejido adiposo que requiere plan calórico.' };
      return { score: 'E', nivel: 'Riesgo Elevado', color: '#e63e11', desc: 'Nivel alto de grasa corporal con impacto metabólico.' };
    } else {
      if (grasa < 20) return { score: 'A', nivel: 'Atlético / Óptimo', color: '#038141', desc: 'Nivel óptimo de composición magra en mujeres.' };
      if (grasa <= 28) return { score: 'B', nivel: 'Saludable', color: '#85bb2f', desc: 'Rango normal saludable para mujeres adultas.' };
      if (grasa <= 33) return { score: 'C', nivel: 'Aceptable Moderado', color: '#fecb02', desc: 'Nivel moderado de grasa corporal.' };
      if (grasa <= 38) return { score: 'D', nivel: 'Sobrepeso Graso', color: '#ee8100', desc: 'Exceso de tejido adiposo que amerita seguimiento dietético.' };
      return { score: 'E', nivel: 'Riesgo Elevado', color: '#e63e11', desc: 'Nivel elevado de grasa con riesgo cardiovascular aumentado.' };
    }
  }

  // Interpretación del Índice Cintura-Talla (ICT)
  protected interpretacionICT(ict: number | null | undefined): { score: string; nivel: string; color: string; desc: string } {
    if (!ict) return { score: '-', nivel: 'Sin Evaluar', color: '#64748b', desc: 'Pendiente de registrar perímetro de cintura.' };
    if (ict < 0.50) return { score: 'A', nivel: 'Bajo Riesgo', color: '#038141', desc: 'Relación cintura-estatura óptima, mínimo riesgo cardiovascular.' };
    if (ict <= 0.58) return { score: 'C', nivel: 'Riesgo Moderado', color: '#fecb02', desc: 'Circunferencia abdominal moderada, requiere vigilancia de grasa visceral.' };
    return { score: 'E', nivel: 'Riesgo Aumentado', color: '#e63e11', desc: 'Adiposidad abdominal elevada con predisposición cardiometabólica.' };
  }

  // Interpretación del % de Apego al Plan Alimenticio
  protected interpretacionApego(porcentaje: number | null | undefined): { score: string; nivel: string; color: string; desc: string } {
    if (porcentaje === null || porcentaje === undefined) {
      return { score: '-', nivel: 'Sin Datos', color: '#64748b', desc: 'No se registran comidas en el periodo evaluado.' };
    }
    if (porcentaje >= 85) {
      return { score: 'A', nivel: 'Excelente Apego', color: '#038141', desc: 'Adherencia óptima al plan alimenticio. Alta probabilidad de éxito clínico.' };
    }
    if (porcentaje >= 70) {
      return { score: 'B', nivel: 'Buen Apego', color: '#85bb2f', desc: 'Adherencia favorable con pequeñas variaciones controladas.' };
    }
    if (porcentaje >= 50) {
      return { score: 'C', nivel: 'Apego Regular', color: '#fecb02', desc: 'Adherencia moderada; requiere reforzar hábitos y constancia en el diario.' };
    }
    if (porcentaje >= 35) {
      return { score: 'D', nivel: 'Bajo Apego', color: '#ee8100', desc: 'Frecuentes comidas modificadas o saltadas que comprometen los objetivos.' };
    }
    return { score: 'E', nivel: 'Apego Crítico', color: '#e63e11', desc: 'Desapego importante; se sugiere reevaluar el menú prescrito y barreras del paciente.' };
  }

  // Interpretación del Cumplimiento de Objetivos
  protected interpretacionMetas(cumplidas: number | undefined, total: number | undefined): { score: string; nivel: string; color: string; desc: string } {
    if (!total || total === 0) {
      return { score: '-', nivel: 'Sin Objetivos', color: '#64748b', desc: 'No hay objetivos asignados en el expediente.' };
    }
    const pct = ((cumplidas || 0) / total) * 100;
    if (pct >= 80) {
      return { score: 'A', nivel: 'Logro Sobresaliente', color: '#038141', desc: 'La gran mayoría de objetivos han sido alcanzados con éxito.' };
    }
    if (pct >= 50) {
      return { score: 'B', nivel: 'Progreso Favorable', color: '#85bb2f', desc: 'Más de la mitad de los objetivos fijados se han cumplido favorablemente.' };
    }
    if (pct > 0) {
      return { score: 'C', nivel: 'En Desarrollo', color: '#fecb02', desc: 'Se registran objetivos cumplidos, con otros aún en proceso de consolidación.' };
    }
    return { score: 'D', nivel: 'Objetivos Pendientes', color: '#ee8100', desc: 'Los objetivos se encuentran en desarrollo o pendientes de validación.' };
  }

  // Ingesta diaria de agua sugerida (35 ml / kg)
  protected aguaSugeridaLitros(pesoKg?: number): string {
    if (!pesoKg || pesoKg <= 0) return '2.0';
    return ((pesoKg * 35) / 1000).toFixed(1);
  }

  // ─── INICIALIZACIÓN GRÁFICOS DE ASISTENCIA (CHART.JS) ─────────────────────

  private inicializarGraficosAsistencia(data: ReporteAsistencia): void {
    if (!data) return;

    // 1. Donut — Comportamiento de Asistencia (ASISTIO vs NO_ASISTIO)
    const ctxAsistencia = document.getElementById('canvas-asistencia') as HTMLCanvasElement;
    if (ctxAsistencia) {
      this.asistenciaChart?.destroy();
      const baseA = data.citasAsistidas + data.citasNoAsistidas;
      const hasA  = baseA > 0;
      this.asistenciaChart = new Chart(ctxAsistencia, {
        type: 'doughnut',
        data: {
          labels: hasA ? ['Asistencias (Completadas)', 'Inasistencias (Perdidas)'] : ['Sin citas registradas'],
          datasets: [{
            data: hasA ? [data.citasAsistidas, data.citasNoAsistidas] : [1],
            backgroundColor: hasA ? ['#038141', '#e63e11'] : ['#e2e8f0'],
            hoverBackgroundColor: hasA ? ['#026633', '#c9330c'] : ['#cbd5e1'],
            borderWidth: 3,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 14,
                padding: 16,
                font: { family: 'inherit', size: 12, weight: 'bold' },
                color: '#334155',
              },
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (item: any) => {
                  if (!hasA) return 'Sin registros';
                  const val = item.raw || 0;
                  const pct = baseA > 0 ? ((val / baseA) * 100).toFixed(1) : '0';
                  return ` ${item.label}: ${val} citas (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }

    // 2. Donut — Tasa de Cancelación (CANCELADAS vs el resto)
    const ctxCancelacion = document.getElementById('canvas-cancelacion') as HTMLCanvasElement;
    if (ctxCancelacion) {
      this.cancelacionChart?.destroy();
      const noCancel = data.totalCitas - data.citasCanceladas;
      const hasC = data.totalCitas > 0;
      this.cancelacionChart = new Chart(ctxCancelacion, {
        type: 'doughnut',
        data: {
          labels: hasC ? ['Canceladas / Bajas', 'Efectivas / Vigentes'] : ['Sin citas registradas'],
          datasets: [{
            data: hasC ? [data.citasCanceladas, noCancel] : [1],
            backgroundColor: hasC ? ['#ee8100', '#85bb2f'] : ['#e2e8f0'],
            hoverBackgroundColor: hasC ? ['#d46f00', '#74a727'] : ['#cbd5e1'],
            borderWidth: 3,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 14,
                padding: 16,
                font: { family: 'inherit', size: 12, weight: 'bold' },
                color: '#334155',
              },
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (item: any) => {
                  if (!hasC) return 'Sin registros';
                  const val = item.raw || 0;
                  const pct = data.totalCitas > 0 ? ((val / data.totalCitas) * 100).toFixed(1) : '0';
                  return ` ${item.label}: ${val} citas (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }

    // 3. Barras Horizontales — Demanda de Servicios por Motivo de Consulta
    const ctxDemanda = document.getElementById('canvas-demanda') as HTMLCanvasElement;
    if (ctxDemanda && data.demandaPorMotivo) {
      this.demandaChart?.destroy();
      const entries = Object.entries(data.demandaPorMotivo)
        .sort((a, b) => (b[1] as number) - (a[1] as number));
      const labels = entries.map(([k]) => this.etiquetaMotivoCita(k));
      const values = entries.map(([, v]) => v);
      const totalDemand = values.reduce((acc, v) => acc + v, 0);
      const palette = ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#e63e11', '#64748b'];

      this.demandaChart = new Chart(ctxDemanda, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Citas',
            data: values,
            backgroundColor: entries.map((_, i) => palette[i % palette.length]),
            hoverBackgroundColor: entries.map((_, i) => palette[i % palette.length]),
            borderRadius: 8,
            borderSkipped: false,
            maxBarThickness: 34,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (item: any) => {
                  const val = item.raw || 0;
                  const pct = totalDemand > 0 ? ((val / totalDemand) * 100).toFixed(1) : '0';
                  return ` Citas: ${val} (${pct}% de la demanda)`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: '#f1f5f9' },
              ticks: { precision: 0, font: { family: 'inherit', size: 11, weight: 'bold' } },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'inherit', size: 12, weight: 'bold' }, color: '#1e293b' },
            },
          },
        },
      });
    }
  }

  // Etiqueta amigable para MotivoCita
  protected etiquetaMotivoCita(clave: string): string {
    const mapa: Record<string, string> = {
      PRIMERA_VEZ:      'Primera Vez',
      SEGUIMIENTO:      'Seguimiento',
      REVISION_DE_PLAN: 'Revisión de Plan',
      NUEVO_SINTOMA:    'Nuevo Síntoma',
      CONTROL_MENSUAL:  'Control Mensual',
      OTRO:             'Otro',
    };
    return mapa[clave] ?? clave;
  }

  // Interpretación clínica del % de asistencia
  protected interpretacionAsistenciaCitas(pct: number | null | undefined): { score: string; nivel: string; color: string; desc: string } {
    if (pct === null || pct === undefined) {
      return { score: '-', nivel: 'Sin Datos', color: '#64748b', desc: 'No hay citas finalizadas en el periodo para calcular el indicador.' };
    }
    if (pct >= 85)  return { score: 'A', nivel: 'Eficiencia Óptima',    color: '#038141', desc: 'Alta tasa de asistencia. El paciente demuestra compromiso con su seguimiento clínico.' };
    if (pct >= 70)  return { score: 'B', nivel: 'Eficiencia Favorable', color: '#85bb2f', desc: 'Buena asistencia con algunas ausencias aisladas que no comprometen el plan.' };
    if (pct >= 50)  return { score: 'C', nivel: 'Eficiencia Moderada',  color: '#fecb02', desc: 'Inasistencias frecuentes. Evaluar barreras del paciente para asistir a citas.' };
    if (pct >= 30)  return { score: 'D', nivel: 'Baja Eficiencia',      color: '#ee8100', desc: 'Tasa de asistencia baja. Se recomienda reforzar la adherencia mediante recordatorios.' };
    return           { score: 'E', nivel: 'Ausentismo Crítico',          color: '#e63e11', desc: 'Ausentismo elevado. Considerar estrategias de retención o contacto proactivo.' };
  }

  // Interpretación de la tasa de cancelación
  protected interpretacionCancelacion(pct: number | null | undefined): { score: string; nivel: string; color: string; desc: string } {
    if (pct === null || pct === undefined) {
      return { score: '-', nivel: 'Sin Datos', color: '#64748b', desc: 'Sin datos suficientes de citas en el periodo.' };
    }
    if (pct <= 10) return { score: 'A', nivel: 'Retención Óptima',    color: '#038141', desc: 'Mínimo índice de cancelación. Excelente adherencia y estabilidad en la agenda.' };
    if (pct <= 20) return { score: 'B', nivel: 'Retención Favorable', color: '#85bb2f', desc: 'Tasa de cancelación controlada dentro de los parámetros esperados.' };
    if (pct <= 35) return { score: 'C', nivel: 'Deserción Moderada',  color: '#fecb02', desc: 'Cancelaciones moderadas. Identificar motivos recurrentes para reducir bajas.' };
    return          { score: 'E', nivel: 'Alta Deserción',       color: '#e63e11', desc: 'Tasa elevada de cancelaciones. Requiere revisión de disponibilidad de horarios y recordatorios.' };
  }

  // Lista procesada de demanda de servicios para iterar en tabla/plantilla
  protected entriesDemanda(demanda?: Record<string, number>): { motivo: string; label: string; cantidad: number; porcentaje: number }[] {
    if (!demanda) return [];
    const total = Object.values(demanda).reduce((acc, v) => acc + v, 0);
    return Object.entries(demanda)
      .map(([motivo, cantidad]) => ({
        motivo,
        label: this.etiquetaMotivoCita(motivo),
        cantidad,
        porcentaje: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  protected onNutriologoChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const val = target.value;
    this.nutriologoIdFiltroAsistencia.set(val ? Number(val) : null);
  }

  // ─── EXPORTACIÓN PDF DE ASISTENCIA ───────────────────────────────────────

  protected async descargarPDFAsistencia(): Promise<void> {
    const data = this.asistenciaResource.value();
    if (!data) return;

    // 1. Asistencia Donut (500x260)
    const baseA = data.citasAsistidas + data.citasNoAsistidas;
    const hasA = baseA > 0;
    const asistImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: hasA ? ['Asistencias', 'Inasistencias'] : ['Sin citas'],
        datasets: [
          {
            data: hasA ? [data.citasAsistidas, data.citasNoAsistidas] : [1],
            backgroundColor: hasA ? ['#038141', '#e63e11'] : ['#e2e8f0'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 8,
              font: { size: 9, weight: 'bold' },
              color: '#1e293b',
            },
          },
        },
      },
      500,
      260
    );

    // 2. Cancelación Donut (500x260)
    const noCancel = data.totalCitas - data.citasCanceladas;
    const hasC = data.totalCitas > 0;
    const cancelImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: hasC ? ['Canceladas / Bajas', 'Efectivas / Vigentes'] : ['Sin citas'],
        datasets: [
          {
            data: hasC ? [data.citasCanceladas, noCancel] : [1],
            backgroundColor: hasC ? ['#ee8100', '#85bb2f'] : ['#e2e8f0'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 8,
              font: { size: 9, weight: 'bold' },
              color: '#1e293b',
            },
          },
        },
      },
      500,
      260
    );

    // 3. Demanda por Motivo Horizontal Bars (700x240)
    const entries = this.entriesDemanda(data.demandaPorMotivo);
    const palette = ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#0284c7', '#8b5cf6'];
    const demandImg = this.renderizarGraficoOffscreen(
      'bar',
      {
        labels: entries.map((e) => e.label),
        datasets: [
          {
            data: entries.map((e) => e.cantidad),
            backgroundColor: entries.map((_, i) => palette[i % palette.length]),
            borderRadius: 6,
            barThickness: 18,
          },
        ],
      },
      {
        indexAxis: 'y',
        layout: { padding: { left: 8, right: 28, top: 6, bottom: 6 } },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            grace: '18%',
            grid: { color: '#f1f5f9' },
            ticks: { precision: 0, font: { size: 9, weight: 'bold' }, color: '#475569' },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 9, weight: 'bold' }, color: '#0f172a' },
          },
        },
      },
      700,
      240
    );

    this.asistenciaChartImg.set(asistImg);
    this.cancelacionChartImg.set(cancelImg);
    this.demandaChartImg.set(demandImg);

    this.isExportingAsistencia.set(true);

    await new Promise((r) => setTimeout(r, 300));

    const element = document.getElementById('clinical-pdf-asistencia');
    if (!element) {
      this.isExportingAsistencia.set(false);
      return;
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `reporte-asistencia-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2.2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 734,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().from(element).set(opt as any).save();
    } finally {
      this.isExportingAsistencia.set(false);
      this.asistenciaChartImg.set(null);
      this.cancelacionChartImg.set(null);
      this.demandaChartImg.set(null);
    }
  }

  /**
   * Plugin de Chart.js para dibujar los valores numéricos sobre o al lado de las barras
   */
  private chartValueLabelsPlugin = {
    id: 'chartValueLabels',
    afterDatasetsDraw: (chart: any) => {
      const { ctx } = chart;
      const isHorizontal = chart.config.options?.indexAxis === 'y';
      ctx.save();
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta.hidden) {
          meta.data.forEach((element: any, index: number) => {
            const val = dataset.data[index];
            if (val !== undefined && val !== null && Number(val) > 0) {
              ctx.font = 'bold 9px Inter, system-ui, sans-serif';
              ctx.fillStyle = '#1e293b';
              if (isHorizontal) {
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${val}`, element.x + 4, element.y);
              } else {
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${val}`, element.x, element.y - 4);
              }
            }
          });
        }
      });
      ctx.restore();
    },
  };

  /**
   * Plugin de Chart.js para dibujar el total y etiqueta en el centro del gráfico de dona
   */
  private chartDoughnutCenterPlugin = {
    id: 'chartDoughnutCenter',
    beforeDraw: (chart: any) => {
      if (chart.config.type !== 'doughnut') return;
      const { ctx, chartArea } = chart;
      if (!chartArea) return;
      const dataset = chart.data.datasets?.[0];
      if (!dataset) return;
      const total = dataset.data.reduce((acc: number, val: any) => acc + (typeof val === 'number' ? val : 0), 0);
      if (total === 0) return;

      ctx.save();
      const centerX = (chartArea.left + chartArea.right) / 2;
      const centerY = (chartArea.top + chartArea.bottom) / 2;

      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${total}`, centerX, centerY - 4);

      ctx.font = '700 8px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('TOTAL', centerX, centerY + 8);
      ctx.restore();
    },
  };

  /**
   * Genera una imagen PNG en Ultra-HD para exportación a PDF.
   * Renderiza el gráfico en un canvas virtual con devicePixelRatio: 2,
   * proporciones exactas y fondo blanco sólido libre de artefactos.
   */
  private renderizarGraficoOffscreen(
    type: 'bar' | 'doughnut' | 'line',
    data: any,
    options: any,
    width = 500,
    height = 260
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Plugin para garantizar fondo blanco sólido
    const whiteBgPlugin = {
      id: 'whiteBgPlugin',
      beforeDraw: (chart: any) => {
        const { ctx: cCtx, width: cWidth, height: cHeight } = chart;
        cCtx.save();
        cCtx.fillStyle = '#ffffff';
        cCtx.fillRect(0, 0, cWidth, cHeight);
        cCtx.restore();
      },
    };

    const chartInstance = new Chart(canvas, {
      type,
      data,
      options: {
        ...options,
        animation: false,
        responsive: false,
        maintainAspectRatio: false,
        devicePixelRatio: 2,
      },
      plugins: [whiteBgPlugin, this.chartValueLabelsPlugin, this.chartDoughnutCenterPlugin],
    });

    const dataUrl = chartInstance.toBase64Image('image/png', 1.0);
    chartInstance.destroy();
    return dataUrl;
  }

  // ─── INICIALIZACIÓN GRÁFICOS DESEMPEÑO DEL NUTRIÓLOGO (PANTALLA) ───────────

  private inicializarGraficosDesempeno(data: ReporteDesempenoNutriologo): void {
    if (!data) return;

    // 1. Gráfico de Top Alimentos Más Asignados (Barras horizontales)
    const ctxTopAlimentos = document.getElementById('canvas-top-alimentos') as HTMLCanvasElement;
    if (ctxTopAlimentos && data.topAlimentosAsignados && data.topAlimentosAsignados.length > 0) {
      this.topAlimentosChart?.destroy();

      const labels = data.topAlimentosAsignados.map(a => a.nombre);
      const values = data.topAlimentosAsignados.map(a => a.vecesUtilizado);
      const palette = ['#038141', '#10b981', '#059669', '#34d399', '#6ee7b7', '#047857', '#85bb2f', '#a3e635', '#fecb02', '#38bdf8'];

      this.topAlimentosChart = new Chart(ctxTopAlimentos, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Veces Asignado',
            data: values,
            backgroundColor: data.topAlimentosAsignados.map((_, i) => palette[i % palette.length]),
            hoverBackgroundColor: data.topAlimentosAsignados.map((_, i) => palette[i % palette.length]),
            borderRadius: 6,
            barThickness: 18,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (item: any) => {
                  const idx = item.dataIndex;
                  const itemData = data.topAlimentosAsignados[idx];
                  return ` Asignado: ${item.raw} veces (${itemData?.porcentajeUso ?? 0}% del total)`;
                },
              },
            },
          },
          scales: {
            x: {
              grace: '12%',
              grid: { color: '#f1f5f9' },
              ticks: { precision: 0, font: { family: 'inherit', size: 11, weight: 'bold' }, color: '#64748b' },
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: 'inherit', size: 11, weight: 'bold' }, color: '#1e293b' },
            },
          },
        },
        plugins: [this.chartValueLabelsPlugin],
      });
    }

    // 2. Gráfico de Plantillas por Tiempo de Comida (Barras Verticales)
    const ctxPlantillas = document.getElementById('canvas-plantillas-tipo') as HTMLCanvasElement;
    if (ctxPlantillas && data.plantillasPorTipoComida) {
      this.plantillasTipoChart?.destroy();

      const rawLabels = Object.keys(data.plantillasPorTipoComida);
      const labels = rawLabels.map(k => this.etiquetaTipoComida(k));
      const values = Object.values(data.plantillasPorTipoComida);
      const colors = ['#85bb2f', '#038141', '#fecb02', '#ee8100', '#0284c7', '#8b5cf6'];

      this.plantillasTipoChart = new Chart(ctxPlantillas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Plantillas Creadas',
            data: values,
            backgroundColor: labels.map((_, i) => colors[i % colors.length]),
            borderRadius: 8,
            barThickness: 32,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { family: 'inherit', size: 11, weight: 'bold' }, color: '#1e293b' } },
            y: { grace: '18%', grid: { color: '#f1f5f9' }, ticks: { precision: 0, font: { family: 'inherit', size: 11 }, color: '#64748b' } },
          },
        },
        plugins: [this.chartValueLabelsPlugin],
      });
    }

    // 3. Gráfico de Alimentos Registrados por Categoría (Donut - Aportación a BD)
    const ctxAlimentosCat = document.getElementById('canvas-alimentos-categoria') as HTMLCanvasElement;
    if (ctxAlimentosCat && data.alimentosRegistradosPorCategoria) {
      this.alimentosCategoriaChart?.destroy();

      const labels = Object.keys(data.alimentosRegistradosPorCategoria);
      const values = Object.values(data.alimentosRegistradosPorCategoria);
      const colors = ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#0284c7', '#e63e11', '#10b981', '#a855f7'];

      this.alimentosCategoriaChart = new Chart(ctxAlimentosCat, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 10,
                font: { family: 'inherit', size: 11, weight: 'bold' },
                generateLabels: (chart: any) => {
                  const chartData = chart.data;
                  if (chartData.labels?.length && chartData.datasets?.length) {
                    const dataset = chartData.datasets[0];
                    const total = dataset.data.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
                    return chartData.labels.map((label: string, i: number) => {
                      const val = dataset.data[i];
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                      return {
                        text: `${label}: ${val} (${pct}%)`,
                        fillStyle: dataset.backgroundColor[i % dataset.backgroundColor.length],
                        strokeStyle: '#ffffff',
                        lineWidth: 2,
                        hidden: isNaN(dataset.data[i]) || chart.getDatasetMeta(0).data[i]?.hidden,
                        index: i,
                      };
                    });
                  }
                  return [];
                },
              },
            },
          },
        },
        plugins: [this.chartDoughnutCenterPlugin],
      });
    }

    // 4. Gráfico de Distribución de Categorías en Plantillas (Donut)
    const ctxDistPrescripcion = document.getElementById('canvas-dist-prescripcion') as HTMLCanvasElement;
    if (ctxDistPrescripcion && data.distribucionAlimentosPorCategoria) {
      this.distPrescripcionChart?.destroy();

      const labels = Object.keys(data.distribucionAlimentosPorCategoria);
      const values = Object.values(data.distribucionAlimentosPorCategoria);
      const colors = ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#0284c7', '#e63e11', '#10b981', '#ec4899'];

      this.distPrescripcionChart = new Chart(ctxDistPrescripcion, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 10,
                font: { family: 'inherit', size: 11, weight: 'bold' },
                generateLabels: (chart: any) => {
                  const chartData = chart.data;
                  if (chartData.labels?.length && chartData.datasets?.length) {
                    const dataset = chartData.datasets[0];
                    const total = dataset.data.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
                    return chartData.labels.map((label: string, i: number) => {
                      const val = dataset.data[i];
                      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                      return {
                        text: `${label}: ${val} (${pct}%)`,
                        fillStyle: dataset.backgroundColor[i % dataset.backgroundColor.length],
                        strokeStyle: '#ffffff',
                        lineWidth: 2,
                        hidden: isNaN(dataset.data[i]) || chart.getDatasetMeta(0).data[i]?.hidden,
                        index: i,
                      };
                    });
                  }
                  return [];
                },
              },
            },
          },
        },
        plugins: [this.chartDoughnutCenterPlugin],
      });
    }
  }

  // Interpretación clínica de la carga de trabajo
  protected interpretacionCargaTrabajo(nivel: string | undefined): { score: string; nivel: string; color: string; desc: string } {
    const n = (nivel || '').toUpperCase();
    if (n === 'OPTIMA') {
      return { score: 'A', nivel: 'Carga Óptima', color: '#038141', desc: 'Excelente equilibrio clínico entre volumen de pacientes activos y consultas completadas.' };
    }
    if (n === 'ALTA') {
      return { score: 'B', nivel: 'Carga Elevada', color: '#85bb2f', desc: 'Ritmo asistencial alto y consistente. Se recomienda monitorear la disponibilidad de agenda.' };
    }
    if (n === 'MODERADA') {
      return { score: 'B', nivel: 'Carga Moderada', color: '#85bb2f', desc: 'Capacidad operativa holgada con espacio disponible para asignar o atender nuevos pacientes.' };
    }
    if (n === 'BAJA') {
      return { score: 'C', nivel: 'Baja Actividad', color: '#fecb02', desc: 'Poco volumen de consultas en el periodo. Se sugiere incentivar el seguimiento de pacientes.' };
    }
    if (n === 'SOBRECARGA') {
      return { score: 'E', nivel: 'Sobrecarga Clínica', color: '#e63e11', desc: 'Alta saturación de consultas. Sugerido balancear citas o redistribuir pacientes para evitar agotamiento.' };
    }
    return { score: '-', nivel: 'Sin Datos', color: '#64748b', desc: 'Sin datos suficientes de actividad en el periodo.' };
  }

  // Traducción amigable para TipoComida
  protected etiquetaTipoComida(clave: string): string {
    const mapa: Record<string, string> = {
      DESAYUNO: 'Desayuno',
      COMIDA: 'Comida',
      CENA: 'Cena',
      COLACION: 'Colación',
      COLACION_MATUTINA: 'Colación Matutina',
      COLACION_VESPERTINA: 'Colación Vespertina',
      PRE_ENTRENO: 'Pre-Entreno',
      POST_ENTRENO: 'Post-Entreno',
      OTRO: 'Otro',
    };
    return mapa[clave] ?? clave;
  }

  // Convertidor de Record a entries ordenados con porcentaje
  protected entriesRecord(rec?: Record<string, number>): { key: string; label: string; cantidad: number; porcentaje: number }[] {
    if (!rec) return [];
    const total = Object.values(rec).reduce((acc, v) => acc + v, 0);
    return Object.entries(rec)
      .map(([k, cantidad]) => ({
        key: k,
        label: this.etiquetaTipoComida(k),
        cantidad,
        porcentaje: total > 0 ? Math.round((cantidad / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  // ─── EXPORTACIÓN PDF DE DESEMPEÑO DEL NUTRIÓLOGO EN ALTA RESOLUCIÓN ────────

  protected async descargarPDFDesempeno(): Promise<void> {
    const data = this.desempenoResource.value();
    if (!data) return;

    // Generar imágenes dedicadas en Ultra-HD con proporciones perfectas
    const palette = ['#038141', '#10b981', '#059669', '#34d399', '#6ee7b7', '#047857', '#85bb2f', '#a3e635', '#fecb02', '#38bdf8'];
    const colorsBars = ['#85bb2f', '#038141', '#fecb02', '#ee8100', '#0284c7', '#8b5cf6'];
    const colorsDonut = ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#0284c7', '#e63e11', '#10b981', '#ec4899'];

    // 1. Top Alimentos Asignados (500x260)
    const topAlimentosImg = this.renderizarGraficoOffscreen(
      'bar',
      {
        labels: data.topAlimentosAsignados.map((a) => a.nombre),
        datasets: [
          {
            data: data.topAlimentosAsignados.map((a) => a.vecesUtilizado),
            backgroundColor: data.topAlimentosAsignados.map((_, i) => palette[i % palette.length]),
            borderRadius: 6,
            barThickness: 16,
          },
        ],
      },
      {
        indexAxis: 'y',
        layout: { padding: { left: 8, right: 28, top: 6, bottom: 6 } },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grace: '18%',
            grid: { color: '#f1f5f9' },
            ticks: { precision: 0, font: { size: 9, weight: 'bold' }, color: '#475569' },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 9, weight: 'bold' }, color: '#0f172a' },
          },
        },
      },
      500,
      260
    );

    // 2. Plantillas por Tiempo de Comida (500x260)
    const plantillasLabels = Object.keys(data.plantillasPorTipoComida || {}).map((k) => this.etiquetaTipoComida(k));
    const plantillasValues = Object.values(data.plantillasPorTipoComida || {});
    const plantillasImg = this.renderizarGraficoOffscreen(
      'bar',
      {
        labels: plantillasLabels,
        datasets: [
          {
            data: plantillasValues,
            backgroundColor: plantillasLabels.map((_, i) => colorsBars[i % colorsBars.length]),
            borderRadius: 6,
            barThickness: 24,
          },
        ],
      },
      {
        layout: { padding: { left: 6, right: 6, top: 12, bottom: 6 } },
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9, weight: 'bold' }, color: '#0f172a' },
          },
          y: {
            grace: '18%',
            grid: { color: '#f1f5f9' },
            ticks: { precision: 0, font: { size: 9, weight: 'bold' }, color: '#475569' },
          },
        },
      },
      500,
      260
    );

    // 3. Distribución de Alimentos en Plantillas (500x260)
    const distLabels = Object.keys(data.distribucionAlimentosPorCategoria || {});
    const distValues = Object.values(data.distribucionAlimentosPorCategoria || {});
    const distImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: distLabels,
        datasets: [
          {
            data: distValues,
            backgroundColor: colorsDonut,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 6,
              font: { size: 9, weight: 'bold' },
              color: '#1e293b',
              generateLabels: (chart: any) => {
                const chartData = chart.data;
                if (chartData.labels?.length && chartData.datasets?.length) {
                  const dataset = chartData.datasets[0];
                  const total = dataset.data.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
                  return chartData.labels.map((label: string, i: number) => {
                    const val = dataset.data[i];
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                    return {
                      text: `${label}: ${val} (${pct}%)`,
                      fillStyle: dataset.backgroundColor[i % dataset.backgroundColor.length],
                      strokeStyle: '#ffffff',
                      lineWidth: 2,
                      hidden: isNaN(dataset.data[i]) || chart.getDatasetMeta(0).data[i]?.hidden,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
        },
      },
      500,
      260
    );

    // 4. Alimentos Registrados por Categoría en BD (500x260)
    const alimentosLabels = Object.keys(data.alimentosRegistradosPorCategoria || {});
    const alimentosValues = Object.values(data.alimentosRegistradosPorCategoria || {});
    const alimentosImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: alimentosLabels,
        datasets: [
          {
            data: alimentosValues,
            backgroundColor: colorsDonut,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 6,
              font: { size: 9, weight: 'bold' },
              color: '#1e293b',
              generateLabels: (chart: any) => {
                const chartData = chart.data;
                if (chartData.labels?.length && chartData.datasets?.length) {
                  const dataset = chartData.datasets[0];
                  const total = dataset.data.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
                  return chartData.labels.map((label: string, i: number) => {
                    const val = dataset.data[i];
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                    return {
                      text: `${label}: ${val} (${pct}%)`,
                      fillStyle: dataset.backgroundColor[i % dataset.backgroundColor.length],
                      strokeStyle: '#ffffff',
                      lineWidth: 2,
                      hidden: isNaN(dataset.data[i]) || chart.getDatasetMeta(0).data[i]?.hidden,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
        },
      },
      500,
      260
    );

    this.topAlimentosChartImg.set(topAlimentosImg);
    this.plantillasTipoChartImg.set(plantillasImg);
    this.distPrescripcionChartImg.set(distImg);
    this.alimentosCategoriaChartImg.set(alimentosImg);

    this.isExportingDesempeno.set(true);

    await new Promise((r) => setTimeout(r, 300));

    const element = document.getElementById('clinical-pdf-desempeno');
    if (!element) {
      this.isExportingDesempeno.set(false);
      return;
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `reporte-desempeno-nutriologo-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2.2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 734,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().from(element).set(opt as any).save();
    } finally {
      this.isExportingDesempeno.set(false);
      this.topAlimentosChartImg.set(null);
      this.plantillasTipoChartImg.set(null);
      this.alimentosCategoriaChartImg.set(null);
      this.distPrescripcionChartImg.set(null);
    }
  }

  // ─── INICIALIZACIÓN GRÁFICOS PROPUESTA DE PLAN (RECEPTIVIDAD) ───────────

  protected etiquetaCategoriaMotivo(clave: string): string {
    const mapa: Record<string, string> = {
      PREFERENCIA_SABOR: 'Gusto o Sabor',
      DISPONIBILIDAD_COSTO: 'Disponibilidad o Costo',
      INTOLERANCIA_DIGESTION: 'Digestión o Intolerancia',
      TIEMPO_PREPARACION: 'Tiempo de Cocina',
      SACIEDAD_ENERGIA: 'Saciedad o Energía',
      VARIEDAD_MENU: 'Variedad o Monotonía',
      OTRO: 'Otro Motivo',
    };
    return mapa[clave] || clave;
  }

  protected interpretacionTasaCambio(tasa: number | null | undefined): {
    score: string;
    nivel: string;
    color: string;
    desc: string;
  } {
    const t = tasa ?? 0;
    if (t === 0) {
      return {
        score: 'A',
        nivel: 'Sin Peticiones',
        color: '#038141',
        desc: 'Planes estables sin solicitudes de ajuste registradas.',
      };
    } else if (t <= 15.0) {
      return {
        score: 'A',
        nivel: 'Receptividad Muy Alta',
        color: '#038141',
        desc: 'Excelente encaje dietético. Menos del 15% de pacientes solicita sustituciones.',
      };
    } else if (t <= 35.0) {
      return {
        score: 'B',
        nivel: 'Comunicación Proactiva Óptima',
        color: '#85bb2f',
        desc: 'Intercambio constructivo. Los pacientes proponen mejoras sin riesgo de deserción.',
      };
    } else if (t <= 55.0) {
      return {
        score: 'C',
        nivel: 'Ajuste Moderado',
        color: '#fecb02',
        desc: 'Demanda de ajustes notable. Se sugiere revisar practicidad de recetas e ingredientes.',
      };
    } else {
      return {
        score: 'D',
        nivel: 'Alta Demanda de Adaptación',
        color: '#ee8100',
        desc: 'Más del 55% de pacientes pide cambios. Se recomienda revisar gustos en primera consulta.',
      };
    }
  }

  protected interpretacionTasaAprobacion(tasa: number | null | undefined): {
    score: string;
    nivel: string;
    color: string;
    desc: string;
  } {
    const t = tasa ?? 0;
    if (t >= 75.0) {
      return {
        score: 'A',
        nivel: 'Excelente Sintonía',
        color: '#038141',
        desc: 'La mayoría de las propuestas del paciente son nutricionalmente viables y aprobadas.',
      };
    } else if (t >= 50.0) {
      return {
        score: 'B',
        nivel: 'Sintonía Favorable',
        color: '#85bb2f',
        desc: 'Buena tasa de adopción de sugerencias con ajustes personalizados.',
      };
    } else {
      return {
        score: 'C',
        nivel: 'Requiere Orientación',
        color: '#ee8100',
        desc: 'Muchas sugerencias fueron rechazadas. Se sugiere educar al paciente en equivalentes.',
      };
    }
  }

  protected entriesRazones(rec?: Record<string, number>): {
    key: string;
    label: string;
    cantidad: number;
    porcentaje: number;
  }[] {
    if (!rec) return [];
    const entries = Object.entries(rec);
    const total = entries.reduce((acc, [, val]) => acc + val, 0);
    return entries.map(([key, val]) => ({
      key,
      label: this.etiquetaCategoriaMotivo(key),
      cantidad: val,
      porcentaje: total > 0 ? Math.round((val / total) * 1000) / 10 : 0,
    })).sort((a, b) => b.cantidad - a.cantidad);
  }

  private inicializarGraficosPropuesta(data: ReportePropuestaPlan): void {
    if (!data) return;

    const colorsDonut = ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#0284c7', '#8b5cf6', '#64748b'];

    // 1. Gráfico de Razones Principales ("Por Qué") - Doughnut
    const ctxRazones = document.getElementById('canvas-razones-propuesta') as HTMLCanvasElement;
    if (ctxRazones && data.razonesPrincipales) {
      this.razonesPropuestaChart?.destroy();

      const rawEntries = Object.entries(data.razonesPrincipales).filter(([, val]) => val > 0);
      const labels = rawEntries.length > 0
        ? rawEntries.map(([k]) => this.etiquetaCategoriaMotivo(k))
        : ['Sin solicitudes'];
      const values = rawEntries.length > 0
        ? rawEntries.map(([, v]) => v)
        : [1];
      const bgColors = rawEntries.length > 0
        ? rawEntries.map((_, i) => colorsDonut[i % colorsDonut.length])
        : ['#cbd5e1'];

      this.razonesPropuestaChart = new Chart(ctxRazones, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: bgColors,
            borderWidth: 2,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 12,
                font: { family: 'inherit', size: 11, weight: 'bold' },
                color: '#1e293b',
              },
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const val = context.parsed;
                  const total = data.totalSolicitudes || 1;
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${context.label}: ${val} solicitudes (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }

    // 2. Gráfico de Alimentos Problemáticos con Más Solicitudes de Sustitución - Horizontal Bar
    const ctxAlimentos = document.getElementById('canvas-alimentos-problematicos') as HTMLCanvasElement;
    if (ctxAlimentos && data.alimentosProblematicos) {
      this.alimentosProblematicosChart?.destroy();

      const top10 = data.alimentosProblematicos.slice(0, 8);
      const labels = top10.map(a => a.nombre);
      const values = top10.map(a => a.vecesSolicitado);

      this.alimentosProblematicosChart = new Chart(ctxAlimentos, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['Sin sustituciones registradas'],
          datasets: [{
            label: 'Veces Solicitado para Cambio',
            data: values.length > 0 ? values : [0],
            backgroundColor: '#ee8100cc',
            borderColor: '#ee8100',
            borderWidth: 1.5,
            borderRadius: 8,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              ticks: { precision: 0, font: { weight: 'bold' } },
              grid: { color: 'rgba(0,0,0,0.05)' },
            },
            y: {
              ticks: { font: { weight: 'bold', size: 11 } },
              grid: { display: false },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const idx = context.dataIndex;
                  const item = top10[idx];
                  if (item) {
                    return ` ${item.vecesSolicitado} solicitudes (${item.porcentajeTotal}% del total sustituido)`;
                  }
                  return ` ${context.parsed.x} veces`;
                },
              },
            },
          },
        },
      });
    }

    // 3. Gráfico de Perfil de Pacientes (Nuevos <= 4 semanas vs Seguimiento) - Doughnut
    const ctxPerfil = document.getElementById('canvas-perfil-pacientes') as HTMLCanvasElement;
    if (ctxPerfil) {
      this.perfilPacientesChart?.destroy();

      const nuevos = data.solicitudesPacientesNuevos;
      const seguimiento = data.solicitudesPacientesSeguimiento;
      const total = data.totalSolicitudes;

      const labels = ['Pacientes Nuevos (≤ 4 sem)', 'Pacientes de Seguimiento (> 4 sem)'];
      const values = total > 0 ? [nuevos, seguimiento] : [1, 0];
      const bgColors = total > 0 ? ['#0284c7', '#85bb2f'] : ['#cbd5e1', '#e2e8f0'];

      this.perfilPacientesChart = new Chart(ctxPerfil, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: bgColors,
            borderWidth: 2,
            borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                padding: 12,
                font: { family: 'inherit', size: 11, weight: 'bold' },
                color: '#1e293b',
              },
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const val = context.parsed;
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                  return ` ${context.label}: ${val} solicitudes (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }

    // 4. Gráfico de Plantillas / Tiempos de Comida más Modificados - Bar Vertical
    const ctxPlantillas = document.getElementById('canvas-plantillas-propuesta') as HTMLCanvasElement;
    if (ctxPlantillas && data.plantillasMasModificadas) {
      this.plantillasPropuestaChart?.destroy();

      const entries = Object.entries(data.plantillasMasModificadas);
      const labels = entries.length > 0 ? entries.map(([k]) => k) : ['Sin datos'];
      const values = entries.length > 0 ? entries.map(([, v]) => v) : [0];

      this.plantillasPropuestaChart = new Chart(ctxPlantillas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Peticiones de Cambio',
            data: values,
            backgroundColor: '#8b5cf6cc',
            borderColor: '#8b5cf6',
            borderWidth: 1.5,
            borderRadius: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0, font: { weight: 'bold' } },
              grid: { color: 'rgba(0,0,0,0.05)' },
            },
            x: {
              ticks: {
                font: { weight: 'bold', size: 11 },
                maxRotation: 30,
                minRotation: 0,
              },
              grid: { display: false },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx: any) => ` ${ctx.parsed.y} modificaciones solicitadas`,
              },
            },
          },
        },
      });
    }
  }

  // ─── EXPORTACIÓN PDF CORPORATIVO / CLÍNICO: PROPUESTA DE PLAN ───────────

  protected async descargarPDFPropuesta(): Promise<void> {
    const data = this.propuestaPlanResource.value();
    if (!data) return;

    const colorsDonut = ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#0284c7', '#8b5cf6', '#64748b'];

    // 1. Offscreen Razones Principales (500x260)
    const rawEntries = Object.entries(data.razonesPrincipales || {}).filter(([, v]) => v > 0);
    const razonesLabels = rawEntries.length > 0
      ? rawEntries.map(([k]) => this.etiquetaCategoriaMotivo(k))
      : ['Sin solicitudes'];
    const razonesValues = rawEntries.length > 0
      ? rawEntries.map(([, v]) => v)
      : [1];
    const razonesBg = rawEntries.length > 0
      ? rawEntries.map((_, i) => colorsDonut[i % colorsDonut.length])
      : ['#cbd5e1'];

    const razonesImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: razonesLabels,
        datasets: [
          {
            data: razonesValues,
            backgroundColor: razonesBg,
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 6,
              font: { size: 9, weight: 'bold' },
              color: '#1e293b',
              generateLabels: (chart: any) => {
                const chartData = chart.data;
                if (chartData.labels?.length && chartData.datasets?.length) {
                  const dataset = chartData.datasets[0];
                  const total = dataset.data.reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
                  return chartData.labels.map((label: string, i: number) => {
                    const val = dataset.data[i];
                    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
                    return {
                      text: `${label}: ${val} (${pct}%)`,
                      fillStyle: dataset.backgroundColor[i % dataset.backgroundColor.length],
                      strokeStyle: '#ffffff',
                      lineWidth: 2,
                      hidden: isNaN(dataset.data[i]) || chart.getDatasetMeta(0).data[i]?.hidden,
                      index: i,
                    };
                  });
                }
                return [];
              },
            },
          },
        },
      },
      500,
      260
    );

    // 2. Offscreen Alimentos Problemáticos (500x260)
    const topFoods = (data.alimentosProblematicos || []).slice(0, 8);
    const alimentosImg = this.renderizarGraficoOffscreen(
      'bar',
      {
        labels: topFoods.map((a) => a.nombre),
        datasets: [
          {
            label: 'Sustituciones',
            data: topFoods.map((a) => a.vecesSolicitado),
            backgroundColor: '#ee8100cc',
            borderColor: '#ee8100',
            borderWidth: 1.5,
            borderRadius: 6,
            barThickness: 16,
          },
        ],
      },
      {
        indexAxis: 'y',
        layout: { padding: { top: 6, bottom: 6, left: 8, right: 28 } },
        scales: {
          x: {
            beginAtZero: true,
            grace: '18%',
            ticks: { font: { size: 9, weight: 'bold' }, color: '#475569', precision: 0 },
            grid: { color: '#f1f5f9' },
          },
          y: {
            ticks: { font: { size: 9, weight: 'bold' }, color: '#1e293b' },
            grid: { display: false },
          },
        },
        plugins: { legend: { display: false } },
      },
      500,
      260
    );

    // 3. Offscreen Perfil de Pacientes (500x260)
    const perfilImg = this.renderizarGraficoOffscreen(
      'doughnut',
      {
        labels: ['Nuevos (≤ 4 sem)', 'Seguimiento (> 4 sem)'],
        datasets: [
          {
            data:
              data.totalSolicitudes > 0
                ? [data.solicitudesPacientesNuevos, data.solicitudesPacientesSeguimiento]
                : [1, 0],
            backgroundColor: ['#0284c7', '#85bb2f'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      {
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } },
        cutout: '58%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 6,
              font: { size: 9, weight: 'bold' },
              color: '#1e293b',
            },
          },
        },
      },
      500,
      260
    );

    // 4. Offscreen Plantillas Modificadas (500x260)
    const plantillasEntries = Object.entries(data.plantillasMasModificadas || {});
    const plantillasImg = this.renderizarGraficoOffscreen(
      'bar',
      {
        labels: plantillasEntries.map(([k]) => k),
        datasets: [
          {
            label: 'Modificaciones',
            data: plantillasEntries.map(([, v]) => v),
            backgroundColor: '#8b5cf6cc',
            borderColor: '#8b5cf6',
            borderWidth: 1.5,
            borderRadius: 6,
            barThickness: 24,
          },
        ],
      },
      {
        layout: { padding: { top: 12, bottom: 6, left: 6, right: 6 } },
        scales: {
          y: {
            beginAtZero: true,
            grace: '18%',
            ticks: { font: { size: 9, weight: 'bold' }, color: '#475569', precision: 0 },
            grid: { color: '#f1f5f9' },
          },
          x: {
            ticks: { font: { size: 9, weight: 'bold' }, color: '#1e293b', maxRotation: 25 },
            grid: { display: false },
          },
        },
        plugins: { legend: { display: false } },
      },
      500,
      260
    );

    this.razonesPropuestaChartImg.set(razonesImg);
    this.alimentosProblematicosChartImg.set(alimentosImg);
    this.perfilPacientesChartImg.set(perfilImg);
    this.plantillasPropuestaChartImg.set(plantillasImg);

    this.isExportingPropuesta.set(true);

    await new Promise((r) => setTimeout(r, 300));

    const element = document.getElementById('clinical-pdf-propuesta');
    if (!element) {
      this.isExportingPropuesta.set(false);
      return;
    }

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `reporte-propuesta-plan-receptividad-${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2.2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 734,
        backgroundColor: '#ffffff',
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    try {
      await html2pdf().from(element).set(opt as any).save();
    } finally {
      this.isExportingPropuesta.set(false);
      this.razonesPropuestaChartImg.set(null);
      this.alimentosProblematicosChartImg.set(null);
      this.perfilPacientesChartImg.set(null);
      this.plantillasPropuestaChartImg.set(null);
    }
  }
}


