import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SugerenciaService } from '../../service/sugerencia-service';
import { ESTADOS_SUGERENCIA } from '../../interfaces/sugerencia.interface';
import { TIPOS_COMIDA } from '../../../plantillas/interfaces/plantilla.interface';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

type TabActivo = 'todas' | 'pendientes';

@Component({
  selector: 'app-sugerencias-nutriologo',
  imports: [RouterLink, Pagination, DecimalPipe, SlicePipe],
  templateUrl: './sugerencias-nutriologo.html',
  styleUrl: './sugerencias-nutriologo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SugerenciasNutriologo {
  private readonly sugerenciaService = inject(SugerenciaService);

  protected readonly tiposComida = TIPOS_COMIDA;
  protected readonly estadosSugerencia = ESTADOS_SUGERENCIA;

  protected tabActivo = signal<TabActivo>('pendientes');
  protected currentPageTodas = signal(0);
  protected pageSizeTodas = signal(10);
  protected currentPagePendientes = signal(0);
  protected pageSizePendientes = signal(10);

  protected currentPage = computed(() =>
    this.tabActivo() === 'todas' ? this.currentPageTodas() : this.currentPagePendientes()
  );

  protected pageSize = computed(() =>
    this.tabActivo() === 'todas' ? this.pageSizeTodas() : this.pageSizePendientes()
  );

  protected todasResource = rxResource({
    params: () => ({ page: this.currentPageTodas(), size: this.pageSizeTodas() }),
    stream: ({ params }) =>
      this.sugerenciaService.obtenerTodasParaNutriologo(params.page, params.size),
  });

  protected pendientesResource = rxResource({
    params: () => ({ page: this.currentPagePendientes(), size: this.pageSizePendientes() }),
    stream: ({ params }) =>
      this.sugerenciaService.obtenerPendientesParaNutriologo(params.page, params.size),
  });

  protected recursoActivo = computed(() =>
    this.tabActivo() === 'todas' ? this.todasResource : this.pendientesResource
  );

  protected cambiarTab(tab: TabActivo): void {
    this.tabActivo.set(tab);
  }

  protected onPageChange(event: PageEvent): void {
    if (this.tabActivo() === 'todas') {
      this.currentPageTodas.set(event.page);
      this.pageSizeTodas.set(event.size);
    } else {
      this.currentPagePendientes.set(event.page);
      this.pageSizePendientes.set(event.size);
    }
  }

  protected obtenerIconTipo(tipo: string): string {
    return this.tiposComida.find((t) => t.value === tipo)?.icon ?? '';
  }

  protected obtenerLabelTipo(tipo: string): string {
    return this.tiposComida.find((t) => t.value === tipo)?.label ?? tipo;
  }

  protected obtenerEstado(estado: string) {
    return this.estadosSugerencia.find((e) => e.value === estado);
  }
}
