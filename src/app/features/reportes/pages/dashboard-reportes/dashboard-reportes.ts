import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReporteService } from '../../service/reporte.service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { Chart } from 'chart.js/auto';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-dashboard-reportes',
  imports: [CommonModule, RouterLink, DecimalPipe],
  templateUrl: './dashboard-reportes.html',
  styleUrl: './dashboard-reportes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardReportes {
  private readonly reporteService = inject(ReporteService);
  private readonly pacienteService = inject(PacienteService);

  // Selector de paciente
  protected readonly pacienteIdSeleccionado = signal<number | null>(null);

  protected readonly fechaActual = new Date();

  // 1. Carga del censo demográfico general
  protected readonly demograficoResource = rxResource({
    stream: () => this.reporteService.obtenerReporteDemografico(),
  });

  // 2. Carga de listado de pacientes para selector (primeros 100)
  protected readonly pacientesResource = rxResource({
    stream: () => this.pacienteService.obtenerPacientes(0, 100),
  });

  // 3. Carga del reporte de progreso para el paciente seleccionado
  protected readonly progresoResource = rxResource({
    params: () => {
      const id = this.pacienteIdSeleccionado();
      return id ? { id } : undefined;
    },
    stream: ({ params }) => this.reporteService.obtenerReporteProgreso(params.id),
  });

  // Instancias de Chart.js
  private generoChart: any = null;
  private edadChart: any = null;
  private nutriologoChart: any = null;
  private pesoChart: any = null;
  private grasaChart: any = null;

  constructor() {
    // Efecto reactivo para dibujar gráficos demográficos en cuanto cambie el recurso demográfico
    effect(() => {
      const r = this.demograficoResource.value();
      if (!r) return;

      // Esperar brevemente a que Angular inserte los elementos canvas en el DOM
      setTimeout(() => {
        this.inicializarGraficosDemograficos(r);
      }, 50);
    });

    // Efecto reactivo para dibujar gráficos de progreso clínico al seleccionar paciente y recibir datos
    effect(() => {
      const p = this.progresoResource.value();
      if (!p || p.fechas.length === 0) return;

      setTimeout(() => {
        this.inicializarGraficosProgreso(p);
      }, 50);
    });
  }

  // ─── INICIALIZACIÓN GRÁFICOS DEMOGRÁFICOS (CHART.JS) ───────────────────────────────

  private inicializarGraficosDemograficos(data: any): void {
    // 1. Gráfico de Género (Donut)
    const ctxGenero = document.getElementById('canvas-genero') as HTMLCanvasElement;
    if (ctxGenero) {
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
          datasets: [{
            data: values,
            backgroundColor: ['#00cec9', '#fd79a8', '#fdcb6e'],
            borderWidth: 2,
            borderColor: '#ffffff',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { family: 'inherit', size: 11, weight: 'bold' }
              }
            }
          }
        }
      });
    }

    // 2. Gráfico de Rango de Edad (Barras Horizontales)
    const ctxEdad = document.getElementById('canvas-edad') as HTMLCanvasElement;
    if (ctxEdad) {
      this.edadChart?.destroy();

      const labels = Object.keys(data.distribucionPorRangoEdad).map(k => `${k} años`);
      const values = Object.values(data.distribucionPorRangoEdad);

      this.edadChart = new Chart(ctxEdad, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Pacientes',
            data: values,
            backgroundColor: 'rgba(108, 92, 231, 0.85)',
            hoverBackgroundColor: '#6c5ce7',
            borderRadius: 6,
            borderWidth: 0,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { display: false }, ticks: { precision: 0 } },
            y: { grid: { display: false } }
          }
        }
      });
    }

    // 3. Gráfico por Nutriólogo (Barras Verticales)
    const ctxNutri = document.getElementById('canvas-nutriologo') as HTMLCanvasElement;
    if (ctxNutri) {
      this.nutriologoChart?.destroy();

      const labels = Object.keys(data.distribucionPorNutriologo);
      const values = Object.values(data.distribucionPorNutriologo);

      this.nutriologoChart = new Chart(ctxNutri, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Pacientes',
            data: values,
            backgroundColor: 'rgba(0, 206, 201, 0.85)',
            hoverBackgroundColor: '#00cec9',
            borderRadius: 6,
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { display: false }, ticks: { precision: 0 } }
          }
        }
      });
    }
  }

  // ─── INICIALIZACIÓN GRÁFICOS DE PROGRESO PACIENTE ─────────────────────────────────

  private inicializarGraficosProgreso(progreso: any): void {
    const fechasFormateadas = progreso.fechas.map((f: string) => f.substring(5, 10).replace('-', '/'));

    // 1. Gráfico de Peso
    const ctxPeso = document.getElementById('canvas-peso') as HTMLCanvasElement;
    if (ctxPeso) {
      this.pesoChart?.destroy();

      this.pesoChart = new Chart(ctxPeso, {
        type: 'line',
        data: {
          labels: fechasFormateadas,
          datasets: [{
            label: 'Peso (kg)',
            data: progreso.pesos,
            borderColor: '#6c5ce7',
            backgroundColor: 'rgba(108, 92, 231, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#6c5ce7',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f1f5f9' } }
          }
        }
      });
    }

    // 2. Gráfico de Porcentaje de Grasa
    const ctxGrasa = document.getElementById('canvas-grasa') as HTMLCanvasElement;
    if (ctxGrasa) {
      this.grasaChart?.destroy();

      this.grasaChart = new Chart(ctxGrasa, {
        type: 'line',
        data: {
          labels: fechasFormateadas,
          datasets: [{
            label: 'Grasa (%)',
            data: progreso.porcentajesGrasa,
            borderColor: '#fd79a8',
            backgroundColor: 'rgba(253, 121, 168, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#fd79a8',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f1f5f9' } }
          }
        }
      });
    }
  }

  // ─── DESCARGAS INDIVIDUALES A PDF CON HTML2PDF ────────────────────────────────────

  protected descargarPDFDemografico(): void {
    const element = document.getElementById('reporte-demografico-pdf');
    if (!element) return;

    element.classList.add('exporting-pdf');

    setTimeout(() => {
      const opt = {
        margin:       10,
        filename:     'reporte_demografico_censo.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
      };

      html2pdf().from(element).set(opt as any).save().then(() => {
        element.classList.remove('exporting-pdf');
      });
    }, 150);
  }

  protected descargarPDFProgreso(): void {
    const element = document.getElementById('reporte-progreso-pdf');
    if (!element) return;

    element.classList.add('exporting-pdf');

    const nombre = this.pacienteSeleccionado()?.nombre || 'Paciente';
    const apellido = this.pacienteSeleccionado()?.apellidoPaterno || '';

    setTimeout(() => {
      const opt = {
        margin:       10,
        filename:     `evolucion_${nombre}_${apellido}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
      };

      html2pdf().from(element).set(opt as any).save().then(() => {
        element.classList.remove('exporting-pdf');
      });
    }, 150);
  }

  // ─── AUXILIARES ──────────────────────────────────────────────────────────────────

  protected readonly totalGeneros = computed(() => {
    const d = this.demograficoResource.value();
    return d && d.distribucionPorGenero ? Object.keys(d.distribucionPorGenero).length : 0;
  });

  protected readonly totalRangosEdad = computed(() => {
    const d = this.demograficoResource.value();
    return d && d.distribucionPorRangoEdad ? Object.keys(d.distribucionPorRangoEdad).length : 0;
  });

  protected seleccionarPaciente(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.pacienteIdSeleccionado.set(value ? Number(value) : null);
  }

  // Listado de pacientes completo
  protected readonly pacientesList = computed(() => {
    return this.pacientesResource.value()?.content ?? [];
  });

  // Paciente actualmente seleccionado (objeto completo)
  protected readonly pacienteSeleccionado = computed(() => {
    const id = this.pacienteIdSeleccionado();
    if (!id) return null;
    return this.pacientesList().find(p => p.id === id) ?? null;
  });

  // Estadísticas del paciente seleccionado
  protected readonly pacienteStats = computed(() => {
    const p = this.progresoResource.value();
    if (!p || !p.pesos || p.pesos.length === 0) return null;

    const inicial = p.pesos[0];
    const actual = p.pesos[p.pesos.length - 1];
    const diff = actual - inicial;

    const inicialGrasa = p.porcentajesGrasa[0] || 0;
    const actualGrasa = p.porcentajesGrasa[p.porcentajesGrasa.length - 1] || 0;
    const diffGrasa = actualGrasa - inicialGrasa;

    return {
      pesoInicial: inicial,
      pesoActual: actual,
      pesoDiferencia: diff,
      grasaInicial: inicialGrasa,
      grasaActual: actualGrasa,
      grasaDiferencia: diffGrasa,
      totalRegistros: p.fechas.length
    };
  });
}
