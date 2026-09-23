import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { SeguimientoService } from '../../service/seguimiento-service';
import { PacienteService } from '../../service/paciente-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { SeguimientoConsulta, SeguimientoPreview } from '../../interfaces/seguimiento.interface';

@Component({
  selector: 'app-nueva-consulta-seguimiento',
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe],
  templateUrl: './nueva-consulta-seguimiento.html',
  styleUrl: './nueva-consulta-seguimiento.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NuevaConsultaSeguimiento {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly notificationService = inject(NotificationService);

  protected readonly pacienteId = signal<number>(
    Number(this.route.snapshot.paramMap.get('id'))
  );

  protected readonly seguimientoId = signal<number | null>(
    this.route.snapshot.paramMap.get('seguimientoId')
      ? Number(this.route.snapshot.paramMap.get('seguimientoId'))
      : null
  );

  protected readonly isEditMode = computed(() => this.seguimientoId() !== null);

  // Fecha local de hoy (YYYY-MM-DD)
  get hoyLocal(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fechas del período
  protected readonly periodoTipo = signal<'SEMANA' | 'QUINCENA' | 'MES' | 'PERSONALIZADO'>('SEMANA');
  protected readonly fechaInicio = signal<string>('');
  protected readonly fechaFin = signal<string>('');

  // Texto del nutriólogo
  protected observaciones = signal<string>('');
  protected conclusiones = signal<string>('');
  protected recomendaciones = signal<string>('');

  // Estados de interfaz y validación
  protected readonly isSaving = signal<boolean>(false);
  protected readonly isSubmitted = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly observacionesTouched = signal<boolean>(false);

  // Validaciones reactivas
  protected readonly fechasError = computed<string | null>(() => {
    if (this.isEditMode()) return null;
    const inicio = this.fechaInicio();
    const fin = this.fechaFin();
    const hoy = this.hoyLocal;

    if (!inicio || !fin) {
      return 'Debes seleccionar tanto la fecha de inicio como la fecha de fin.';
    }
    if (fin > hoy) {
      return 'La fecha de fin no puede ser una fecha futura (máximo hoy).';
    }
    if (inicio > fin) {
      return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
    }
    return null;
  });

  protected readonly observacionesError = computed<string | null>(() => {
    const obs = this.observaciones()?.trim() ?? '';
    if (!obs) {
      return 'Las observaciones son obligatorias.';
    }
    if (obs.length < 5) {
      return 'Las observaciones deben contener al menos 5 caracteres.';
    }
    return null;
  });

  protected readonly isFormValid = computed<boolean>(() => {
    if (this.observacionesError() !== null) return false;
    if (!this.isEditMode() && this.fechasError() !== null) return false;
    return true;
  });

  // Recurso Paciente
  protected readonly pacienteResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) => this.pacienteService.obtenerPacientePorId(params.id),
  });

  // Recurso Preview (Crear)
  protected readonly previewResource = rxResource({
    params: () => {
      if (this.isEditMode()) return undefined;
      const fInicio = this.fechaInicio();
      const fFin = this.fechaFin();
      const error = this.fechasError();
      return (!error && fInicio && fFin) ? { pId: this.pacienteId(), fInicio, fFin } : undefined;
    },
    stream: ({ params }) => this.seguimientoService.obtenerPreview(params.pId, params.fInicio, params.fFin),
  });

  // Recurso Existente (Editar)
  protected readonly existenteResource = rxResource({
    params: () => {
      const sId = this.seguimientoId();
      return sId ? { sId } : undefined;
    },
    stream: ({ params }) => this.seguimientoService.obtenerPorId(params.sId),
  });

  constructor() {
    // Inicializar fechas por defecto (Semana previa hasta hoy local)
    const hoy = new Date();
    const hace7Dias = new Date();
    hace7Dias.setDate(hoy.getDate() - 7);

    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    this.fechaFin.set(this.hoyLocal);
    this.fechaInicio.set(formatLocalDate(hace7Dias));

    // En modo edición, rellenar campos existentes
    effect(() => {
      const exist = this.existenteResource.value();
      if (exist && this.isEditMode()) {
        this.fechaInicio.set(exist.fechaInicio);
        this.fechaFin.set(exist.fechaFin);
        this.observaciones.set(exist.observaciones || '');
        this.conclusiones.set(exist.conclusiones || '');
        this.recomendaciones.set(exist.recomendaciones || '');
      }
    });
  }

  protected cambiarPeriodo(tipo: 'SEMANA' | 'QUINCENA' | 'MES' | 'PERSONALIZADO'): void {
    this.periodoTipo.set(tipo);
    const hoy = new Date();

    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (tipo === 'SEMANA') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 7);
      this.fechaFin.set(this.hoyLocal);
      this.fechaInicio.set(formatLocalDate(inicio));
    } else if (tipo === 'QUINCENA') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 15);
      this.fechaFin.set(this.hoyLocal);
      this.fechaInicio.set(formatLocalDate(inicio));
    } else if (tipo === 'MES') {
      const inicio = new Date();
      inicio.setDate(hoy.getDate() - 30);
      this.fechaFin.set(this.hoyLocal);
      this.fechaInicio.set(formatLocalDate(inicio));
    }
  }

  protected getAdherenciaBadge(pctAlimentos: number, pctActividad: number): { label: string; cssClass: string; icon: string; score: number } {
    const score = Math.round((pctAlimentos * 0.6) + (pctActividad * 0.4));
    if (score >= 85) {
      return { label: 'Adherencia Excelente', cssClass: 'badge-excelente', icon: 'bx-star', score };
    }
    if (score >= 70) {
      return { label: 'Buen Progreso', cssClass: 'badge-bueno', icon: 'bx-check-circle', score };
    }
    if (score >= 50) {
      return { label: 'Progreso Regular', cssClass: 'badge-regular', icon: 'bx-error-circle', score };
    }
    return { label: 'Requiere Atención', cssClass: 'badge-critico', icon: 'bx-error', score };
  }

  protected guardar(): void {
    this.isSubmitted.set(true);
    this.observacionesTouched.set(true);
    this.errorMessage.set(null);

    // Validar observaciones obligatorias
    const obsErr = this.observacionesError();
    if (obsErr) {
      this.errorMessage.set(obsErr);
      this.notificationService.error(obsErr);
      return;
    }

    if (this.isEditMode()) {
      const sId = this.seguimientoId()!;
      this.isSaving.set(true);
      this.seguimientoService.editarObservaciones(sId, {
        observaciones: this.observaciones().trim(),
        conclusiones: this.conclusiones().trim() || null,
        recomendaciones: this.recomendaciones().trim() || null,
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success('Observaciones de seguimiento actualizadas correctamente.');
          this.router.navigate(['/main/pacientes', this.pacienteId(), 'seguimiento']);
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err.error?.mensaje || 'Error al actualizar las observaciones.';
          this.errorMessage.set(msg);
          this.notificationService.error(msg);
        }
      });
    } else {
      // Validar fechas obligatorias y restricciones
      const fErr = this.fechasError();
      if (fErr) {
        this.errorMessage.set(fErr);
        this.notificationService.error(fErr);
        return;
      }

      this.isSaving.set(true);
      this.seguimientoService.crear({
        pacienteId: this.pacienteId(),
        fechaInicio: this.fechaInicio(),
        fechaFin: this.fechaFin(),
        observaciones: this.observaciones().trim(),
        conclusiones: this.conclusiones().trim() || null,
        recomendaciones: this.recomendaciones().trim() || null,
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.notificationService.success('Consulta de seguimiento guardada exitosamente.');
          this.router.navigate(['/main/pacientes', this.pacienteId(), 'seguimiento']);
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err.error?.mensaje || 'Error al guardar la consulta de seguimiento.';
          this.errorMessage.set(msg);
          this.notificationService.error(msg);
        }
      });
    }
  }

  protected cancelar(): void {
    this.router.navigate(['/main/pacientes', this.pacienteId(), 'seguimiento']);
  }
}
