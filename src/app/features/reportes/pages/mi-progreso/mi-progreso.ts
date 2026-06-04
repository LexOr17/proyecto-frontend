import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ReporteService } from '../../service/reporte.service';
import { AuthService } from '../../../../core/services/auth-service';
import { Chart } from 'chart.js/auto';
import html2pdf from 'html2pdf.js';

interface HistorialMedidaLocal {
  fecha: string;
  peso: number;
  grasa: number | null;
  ict: number | null;
  icc: number | null;
}

@Component({
  selector: 'app-mi-progreso',
  imports: [CommonModule, DecimalPipe],
  templateUrl: './mi-progreso.html',
  styleUrl: './mi-progreso.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiProgreso {
  private readonly reporteService = inject(ReporteService);
  protected readonly authService = inject(AuthService);

  // 1. Obtener el ID del paciente logueado
  protected readonly pacienteId = computed(() => this.authService.userId());

  // 2. rxResource reactivo: carga el progreso del paciente
  protected readonly progresoResource = rxResource({
    params: () => {
      const id = this.pacienteId();
      return id ? { id } : undefined;
    },
    stream: ({ params }) => this.reporteService.obtenerReporteProgreso(params.id),
  });

  // Instancias de Chart.js
  private pesoChart: any = null;
  private grasaChart: any = null;

  protected readonly fechaActual = new Date();

  constructor() {
    // Efecto reactivo para dibujar gráficos de progreso clínico al recibir datos
    effect(() => {
      const p = this.progresoResource.value();
      if (!p || !p.fechas || p.fechas.length === 0) return;

      setTimeout(() => {
        this.inicializarGraficos(p);
      }, 50);
    });
  }

  // ─── PROCESAMIENTO DE DATOS ──────────────────────────────────────────────────────

  // Estadísticas clave (Inicial, Actual, Cambio)
  protected readonly metrics = computed(() => {
    const r = this.progresoResource.value();
    if (!r || !r.pesos || r.pesos.length === 0) return null;

    const inicial = r.pesos[0];
    const actual = r.pesos[r.pesos.length - 1];
    const diff = actual - inicial;

    const inicialGrasa = r.porcentajesGrasa[0] || 0;
    const actualGrasa = r.porcentajesGrasa[r.porcentajesGrasa.length - 1] || 0;
    const diffGrasa = actualGrasa - inicialGrasa;

    return {
      pesoInicial: inicial,
      pesoActual: actual,
      pesoDiferencia: diff,
      grasaInicial: inicialGrasa,
      grasaActual: actualGrasa,
      grasaDiferencia: diffGrasa,
      totalRegistros: r.fechas.length
    };
  });

  // Listado de historial en orden inverso (más reciente primero) para la tabla
  protected readonly historialMedidas = computed((): HistorialMedidaLocal[] => {
    const r = this.progresoResource.value();
    if (!r || !r.fechas) return [];

    const list: HistorialMedidaLocal[] = [];
    for (let i = r.fechas.length - 1; i >= 0; i--) {
      list.push({
        fecha: r.fechas[i],
        peso: r.pesos[i],
        grasa: r.porcentajesGrasa[i],
        ict: r.indicesCinturaTalla[i],
        icc: r.indicesCinturaCadera[i],
      });
    }
    return list;
  });

  // ─── INICIALIZACIÓN GRÁFICOS (CHART.JS) ──────────────────────────────────────────

  private inicializarGraficos(progreso: any): void {
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

  // ─── DESCARGA DE PDF ─────────────────────────────────────────────────────────────

  protected descargarPDFProgreso(): void {
    const element = document.getElementById('reporte-personal-pdf');
    if (!element) return;

    element.classList.add('exporting-pdf');

    const fullname = this.authService.userFullName() || 'mi';
    const cleanName = fullname.toLowerCase().replace(/\s+/g, '_');

    setTimeout(() => {
      const opt = {
        margin:       10,
        filename:     `mi_progreso_${cleanName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2.2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
      };

      html2pdf().from(element).set(opt as any).save().then(() => {
        element.classList.remove('exporting-pdf');
      });
    }, 150);
  }
}
