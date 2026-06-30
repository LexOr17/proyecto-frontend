import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../service/dashboard.service';
import { AdminDashboardStats } from '../../interfaces/dashboard.interfaces';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  stats = signal<AdminDashboardStats | null>(null);
  reporteDemografico = signal<any | null>(null);
  usuariosRecientes = signal<any[]>([]);
  loading = signal(true);
  today = new Date();

  // Datos procesados para las gráficas
  chartNutriologo = signal<{ label: string; value: number; pct: number }[]>([]);
  chartGenero = signal<{ label: string; value: number; pct: number; color: string }[]>([]);
  chartEdad = signal<{ label: string; value: number; pct: number }[]>([]);

  readonly COLORS_NUTRIOLOGO = [
    '#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#7c3aed','#4f46e5','#818cf8','#ddd6fe',
  ];

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);

    // Estadísticas del admin
    this.dashboardService.getAdminStats().subscribe({
      next: (res) => {
        if (res.datos) this.stats.set(res.datos);
      },
    });

    // Reporte demográfico para las gráficas
    this.dashboardService.getReporteDemografico().subscribe({
      next: (data) => {
        this.reporteDemografico.set(data);
        this.procesarGraficas(data);
      },
    });

    // Usuarios recientes
    this.dashboardService.getUsuariosRecientes().subscribe({
      next: (res) => {
        const usuarios = res?.datos?.content ?? [];
        this.usuariosRecientes.set(usuarios.slice(0, 6));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private procesarGraficas(data: any): void {
    if (!data) return;

    // Distribución por Nutriólogo
    const distNutr = data.distribucionPorNutriologo ?? {};
    const totalNutr = Object.values(distNutr).reduce((a: any, b: any) => a + b, 0) as number;
    const nutriData = Object.entries(distNutr).map(([label, value]: [string, any], i) => ({
      label,
      value,
      pct: totalNutr > 0 ? Math.round((value / totalNutr) * 100) : 0,
    }));
    this.chartNutriologo.set(nutriData);

    // Distribución por Género
    const distGen = data.distribucionPorGenero ?? {};
    const totalGen = Object.values(distGen).reduce((a: any, b: any) => a + b, 0) as number;
    const genColors: Record<string, string> = {
      MASCULINO: '#6366f1',
      FEMENINO: '#ec4899',
      OTRO: '#10b981',
    };
    const genData = Object.entries(distGen).map(([label, value]: [string, any]) => ({
      label: label === 'MASCULINO' ? 'Masculino' : label === 'FEMENINO' ? 'Femenino' : label,
      value,
      pct: totalGen > 0 ? Math.round((value / totalGen) * 100) : 0,
      color: genColors[label] ?? '#94a3b8',
    }));
    this.chartGenero.set(genData);

    // Distribución por Edad
    const distEdad = data.distribucionPorRangoEdad ?? {};
    const totalEdad = Object.values(distEdad).reduce((a: any, b: any) => a + b, 0) as number;
    const edadData = Object.entries(distEdad).map(([label, value]: [string, any]) => ({
      label,
      value,
      pct: totalEdad > 0 ? Math.round((value / totalEdad) * 100) : 0,
    }));
    this.chartEdad.set(edadData);
  }

  getRolBadgeClass(rol: string): string {
    const map: Record<string, string> = {
      ADMINISTRADOR: 'badge-admin',
      NUTRIOLOGO: 'badge-nutri',
      PACIENTE: 'badge-paciente',
    };
    return map[rol] ?? '';
  }

  getRolLabel(rol: string): string {
    const map: Record<string, string> = {
      ADMINISTRADOR: 'Admin',
      NUTRIOLOGO: 'Nutriólogo',
      PACIENTE: 'Paciente',
    };
    return map[rol] ?? rol;
  }

  getColorNutriologo(index: number): string {
    return this.COLORS_NUTRIOLOGO[index % this.COLORS_NUTRIOLOGO.length];
  }

  getMaxEdad(): number {
    const data = this.chartEdad();
    return Math.max(...data.map((d) => d.value), 1);
  }
}
