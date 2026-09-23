import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth-service';
import { CalendarioService } from '../../service/calendario.service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { PlanAlimenticioService } from '../../../planes/service/plan-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import {
  CalendarDay,
  CalendarioDiaNutriologoResponse,
  CalendarioDiaPacienteResponse,
  CalendarioMesNutriologoResponse,
  CalendarioMesPacienteResponse,
  CitaCalendario,
  ComidaProgramadaCalendario,
  ESTADO_CITA_COLOR,
  ESTADO_CITA_LABEL,
  ESTADO_DIARIO_LABEL,
  HORARIO_LABEL,
  MOTIVO_CITA_LABEL,
  PlanPorFinalizar,
  RegistroDiarioCalendario,
} from '../../interfaces/calendario.interface';
import { ModalCrearCita } from '../../components/modal-crear-cita/modal-crear-cita';
import { ModalDetalleCita } from '../../components/modal-detalle-cita/modal-detalle-cita';
import { ModalRegistrarDiario } from '../../components/modal-registrar-diario/modal-registrar-diario';
import { ModalRegistrarBienestar } from '../../components/modal-registrar-bienestar/modal-registrar-bienestar';
import { ModalSolicitarCita } from '../../components/modal-solicitar-cita/modal-solicitar-cita';

@Component({
  selector: 'app-calendario-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ModalCrearCita,
    ModalDetalleCita,
    ModalRegistrarDiario,
    ModalRegistrarBienestar,
    ModalSolicitarCita,
  ],
  templateUrl: './calendario-page.html',
  styleUrl: './calendario-page.css',
})
export class CalendarioPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly calendarioService = inject(CalendarioService);
  private readonly pacienteService = inject(PacienteService);
  private readonly planService = inject(PlanAlimenticioService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private planesSubscription?: Subscription;

  // ─── Constantes ─────────────────────────────────────────────────────────────
  readonly DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  readonly ESTADO_CITA_LABEL = ESTADO_CITA_LABEL;
  readonly ESTADO_CITA_COLOR = ESTADO_CITA_COLOR;
  readonly ESTADO_DIARIO_LABEL = ESTADO_DIARIO_LABEL;
  readonly HORARIO_LABEL = HORARIO_LABEL;
  readonly MOTIVO_CITA_LABEL = MOTIVO_CITA_LABEL;

  // ─── Estado Reactivo Principal ──────────────────────────────────────────────
  readonly currentUserRole = this.authService.currentUserRole;

  private readonly today = new Date();
  currentYear = signal<number>(this.today.getFullYear());
  currentMonth = signal<number>(this.today.getMonth() + 1); // 1-12
  selectedDateStr = signal<string | null>(null);

  mesDataNutriologo = signal<CalendarioMesNutriologoResponse | null>(null);
  mesDataPaciente = signal<CalendarioMesPacienteResponse | null>(null);
  diaDataNutriologo = signal<CalendarioDiaNutriologoResponse | null>(null);
  diaDataPaciente = signal<CalendarioDiaPacienteResponse | null>(null);
  planesNutriologoMap = signal<Map<string, PlanPorFinalizar[]>>(new Map());

  isLoadingMes = signal<boolean>(false);
  isLoadingDia = signal<boolean>(false);
  isDrawerOpen = signal<boolean>(false);
  error = signal<string | null>(null);

  // ─── Modales Estado Reactivo ────────────────────────────────────────────────
  isModalCrearCitaOpen = signal<boolean>(false);
  isModalDetalleCitaOpen = signal<boolean>(false);
  isModalRegistrarDiarioOpen = signal<boolean>(false);
  isModalRegistrarBienestarOpen = signal<boolean>(false);
  isModalSolicitarCitaOpen = signal<boolean>(false);

  selectedHoraLibreISO = signal<string | null>(null);
  selectedCitaParaDetalle = signal<CitaCalendario | null>(null);
  selectedComidaParaDiario = signal<ComidaProgramadaCalendario | null>(null);
  selectedRegistroParaDiario = signal<RegistroDiarioCalendario | null>(null);

  // ─── Computed ────────────────────────────────────────────────────────────────
  readonly mesNombre = computed(() => this.MESES[this.currentMonth() - 1]);

  readonly todayStr = computed(() => this.formatDate(this.today));

  readonly selectedDatePlanesFinalizan = computed<PlanPorFinalizar[]>(() => {
    const dateStr = this.selectedDateStr();
    if (!dateStr) return [];
    return this.planesNutriologoMap().get(dateStr) ?? [];
  });

  readonly calendarGrid = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const resumenNutriologo = this.mesDataNutriologo()?.dias ?? [];
    const resumenPaciente = this.mesDataPaciente()?.dias ?? [];
    const planesMap = this.planesNutriologoMap();
    const selectedStr = this.selectedDateStr();

    // Primer día del mes y total de días
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();

    // Ajuste: lunes = 0
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: CalendarDay[] = [];

    // Días del mes anterior
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      const dateStr = this.formatDate(d);
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === this.todayStr(),
        isSelected: dateStr === selectedStr,
        planesFinalizan: planesMap.get(dateStr) ?? [],
      });
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month - 1, d);
      const dateStr = this.formatDate(date);
      days.push({
        date,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === this.todayStr(),
        isSelected: dateStr === selectedStr,
        resumenNutriologo: resumenNutriologo.find(r => r.fecha === dateStr),
        resumenPaciente: resumenPaciente.find(r => r.fecha === dateStr),
        planesFinalizan: planesMap.get(dateStr) ?? [],
      });
    }

    // Días del mes siguiente para completar 42 celdas
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(year, month, d);
        const dateStr = this.formatDate(date);
        days.push({
          date,
          dateStr,
          isCurrentMonth: false,
          isToday: dateStr === this.todayStr(),
          isSelected: dateStr === selectedStr,
          planesFinalizan: planesMap.get(dateStr) ?? [],
        });
      }
    }

    return days;
  });

  readonly drawerTitulo = computed(() => {
    const dateStr = this.selectedDateStr();
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = this.MESES;
    return `${diasSemana[date.getDay()]}, ${date.getDate()} de ${meses[date.getMonth()]} ${date.getFullYear()}`;
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.cargarMes();
  }

  // ─── Navegación de Mes ──────────────────────────────────────────────────────
  mesAnterior(): void {
    let month = this.currentMonth() - 1;
    let year = this.currentYear();
    if (month < 1) { month = 12; year--; }
    this.currentMonth.set(month);
    this.currentYear.set(year);
    this.cerrarDrawer();
    this.cargarMes();
  }

  mesSiguiente(): void {
    let month = this.currentMonth() + 1;
    let year = this.currentYear();
    if (month > 12) { month = 1; year++; }
    this.currentMonth.set(month);
    this.currentYear.set(year);
    this.cerrarDrawer();
    this.cargarMes();
  }

  irAHoy(): void {
    this.currentYear.set(this.today.getFullYear());
    this.currentMonth.set(this.today.getMonth() + 1);
    this.cerrarDrawer();
    this.cargarMes();
  }

  // ─── Carga de Datos ─────────────────────────────────────────────────────────
  cargarMes(): void {
    const year = this.currentYear();
    const month = this.currentMonth();
    this.isLoadingMes.set(true);
    this.error.set(null);

    if (this.currentUserRole() === 'NUTRIOLOGO') {
      this.calendarioService.getMesNutriologo(year, month).subscribe({
        next: data => {
          this.mesDataNutriologo.set(data);
          this.isLoadingMes.set(false);
        },
        error: err => {
          console.error('Error al cargar mes nutriólogo', err);
          this.error.set('No se pudo cargar el calendario. Verifica tu conexión.');
          this.isLoadingMes.set(false);
        },
      });

      // Cargar planes de pacientes para calcular fechas de finalización
      this.cargarPlanesDePacientes();
    } else if (this.currentUserRole() === 'PACIENTE') {
      this.calendarioService.getMesPaciente(year, month).subscribe({
        next: data => {
          this.mesDataPaciente.set(data);
          this.isLoadingMes.set(false);
        },
        error: err => {
          console.error('Error al cargar mes paciente', err);
          this.error.set('No se pudo cargar el calendario. Verifica tu conexión.');
          this.isLoadingMes.set(false);
        },
      });
    }
  }

  private cargarPlanesDePacientes(): void {
    this.planesSubscription?.unsubscribe();

    this.planesSubscription = this.pacienteService
      .obtenerPacientes(0, 100)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((pacientesPage) => {
          const pacientes = (pacientesPage.content || []).filter(p => !!p.id);
          if (!pacientes.length) return of([]);

          const requests = pacientes.map(p =>
            this.planService.obtenerPlanesDePaciente(p.id!).pipe(
              map(res => ({
                paciente: p,
                planes: res.datos || []
              })),
              catchError(() => of({ paciente: p, planes: [] }))
            )
          );
          return forkJoin(requests);
        })
      )
      .subscribe({
        next: (results) => {
          const newMap = new Map<string, PlanPorFinalizar[]>();
          const seenPlanIds = new Set<number>();

          results.forEach(({ paciente, planes }) => {
            const pNombre = `${paciente.nombre} ${paciente.apellidoPaterno} ${paciente.apellidoMaterno ?? ''}`.trim();
            planes.forEach(plan => {
              if (plan.id && !seenPlanIds.has(plan.id) && plan.fechaInicio && plan.duracionDias) {
                seenPlanIds.add(plan.id);
                const [y, m, d] = plan.fechaInicio.split('-').map(Number);
                const finDate = new Date(y, m - 1, d + plan.duracionDias - 1);
                const finDateStr = this.formatDate(finDate);
                const arr = newMap.get(finDateStr) || [];
                arr.push({
                  planId: plan.id,
                  planNombre: plan.nombre,
                  pacienteId: paciente.id!,
                  pacienteNombre: pNombre,
                  fechaInicio: plan.fechaInicio,
                  duracionDias: plan.duracionDias,
                  fechaFin: finDateStr,
                });
                newMap.set(finDateStr, arr);
              }
            });
          });

          this.planesNutriologoMap.set(newMap);
        },
        error: (err) => {
          console.error('Error al obtener pacientes para fechas de fin de plan', err);
        }
      });
  }

  seleccionarDia(day: CalendarDay): void {
    this.selectedDateStr.set(day.dateStr);
    this.isDrawerOpen.set(true);
    this.cargarDetalleDia(day.dateStr);
  }

  private cargarDetalleDia(dateStr: string): void {
    this.diaDataNutriologo.set(null);
    this.diaDataPaciente.set(null);
    this.isLoadingDia.set(true);

    if (this.currentUserRole() === 'NUTRIOLOGO') {
      this.calendarioService.getDiaNutriologo(dateStr).subscribe({
        next: data => {
          if (data && data.pacientesSinDiario) {
            const mapUnique = new Map<number, (typeof data.pacientesSinDiario)[0]>();
            data.pacientesSinDiario.forEach(p => {
              if (!mapUnique.has(p.pacienteId)) {
                mapUnique.set(p.pacienteId, p);
              }
            });
            data.pacientesSinDiario = Array.from(mapUnique.values());
          }
          this.diaDataNutriologo.set(data);
          this.isLoadingDia.set(false);
        },
        error: err => {
          console.error('Error al cargar día nutriólogo', err);
          this.isLoadingDia.set(false);
        },
      });
    } else if (this.currentUserRole() === 'PACIENTE') {
      this.calendarioService.getDiaPaciente(dateStr).subscribe({
        next: data => {
          this.diaDataPaciente.set(data);
          this.isLoadingDia.set(false);
        },
        error: err => {
          console.error('Error al cargar día paciente', err);
          this.isLoadingDia.set(false);
        },
      });
    }
  }

  recargarDiaActual(): void {
    const current = this.selectedDateStr();
    if (current) {
      this.cargarDetalleDia(current);
    }
    this.cargarMes();
  }

  cerrarDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedDateStr.set(null);
    this.diaDataNutriologo.set(null);
    this.diaDataPaciente.set(null);
  }

  // ─── Triggers de Modales Interactivas ─────────────────────────────────────────

  abrirModalCrearCita(fechaHoraCompleta?: string): void {
    const fechaHora = fechaHoraCompleta || `${this.selectedDateStr()}T09:00:00`;
    this.selectedHoraLibreISO.set(fechaHora);
    this.isModalCrearCitaOpen.set(true);
  }

  abrirModalDetalleCita(cita: CitaCalendario): void {
    this.selectedCitaParaDetalle.set(cita);
    this.isModalDetalleCitaOpen.set(true);
  }

  abrirModalRegistrarDiario(
    comida: ComidaProgramadaCalendario,
    registro?: RegistroDiarioCalendario | null
  ): void {
    const selDate = this.selectedDateStr();
    if (selDate && selDate > this.todayStr()) {
      this.notificationService.warning('No es posible registrar comidas en fechas futuras.');
      return;
    }
    this.selectedComidaParaDiario.set(comida);
    this.selectedRegistroParaDiario.set(registro || null);
    this.isModalRegistrarDiarioOpen.set(true);
  }

  abrirModalRegistrarBienestar(): void {
    const selDate = this.selectedDateStr();
    if (selDate && selDate > this.todayStr()) {
      this.notificationService.warning('No es posible registrar el bienestar en fechas futuras.');
      return;
    }
    this.isModalRegistrarBienestarOpen.set(true);
  }

  abrirModalSolicitarCita(): void {
    this.isModalSolicitarCitaOpen.set(true);
  }

  verPaciente(pacienteId: number): void {
    this.router.navigate(['/main/pacientes', pacienteId]);
  }

  irAPlan(planId: number): void {
    this.router.navigate(['/main/planes', planId]);
  }

  crearPlanParaPaciente(pacienteId: number, pacienteNombre: string): void {
    this.router.navigate(['/main/planes/nuevo'], {
      state: {
        pacienteId,
        pacienteNombre,
        nombre: `Plan de Alimentación - ${pacienteNombre}`,
        fechaInicio: this.formatDate(new Date()),
        duracionDias: 14,
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  formatHora(fechaHora: string): string {
    const date = new Date(fechaHora);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  getRegistroPorHorario(dia: CalendarioDiaPacienteResponse, horario: string) {
    return dia.registrosDiario.find(r => r.horario === horario);
  }

  getEstadoDiarioClass(estado: string): string {
    const map: Record<string, string> = {
      CUMPLIDO: 'estado-diario--cumplido',
      MODIFICADO: 'estado-diario--modificado',
      SALTADA: 'estado-diario--saltada',
      NO_REGISTRADO: 'estado-diario--pendiente',
    };
    return map[estado] ?? '';
  }

  trackByDate(index: number, day: CalendarDay): string {
    return day.dateStr;
  }
}
