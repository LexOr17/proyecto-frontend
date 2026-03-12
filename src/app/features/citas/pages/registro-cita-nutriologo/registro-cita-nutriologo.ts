import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaService } from '../../service/cita-service';
import { AuthService } from '../../../../core/services/auth-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { MotivoCita } from '../../interfaces/cita.interface';

@Component({
  selector: 'app-registro-cita-nutriologo',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro-cita-nutriologo.html',
  styleUrl: './registro-cita-nutriologo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroCitaNutriologo {
  private readonly fb = inject(FormBuilder);
  private readonly citaService = inject(CitaService);
  private readonly authService = inject(AuthService);
  private readonly pacienteService = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  protected readonly isSubmitting = signal(false);

  protected readonly citaId = signal<number | null>(
    this.route.snapshot.paramMap.has('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : null
  );

  protected readonly modoEdicion = computed(() => this.citaId() !== null);
  protected readonly titulo = computed(() =>
    this.modoEdicion() ? 'Editar Cita' : 'Nueva Cita'
  );

  protected readonly motivoCitaOptions: { value: MotivoCita; label: string }[] = [
    { value: 'PRIMERA_VEZ', label: 'Primera vez' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
    { value: 'REVISION_DE_PLAN', label: 'Revisión de plan' },
    { value: 'NUEVO_SINTOMA', label: 'Nuevo síntoma' },
    { value: 'CONTROL_MENSUAL', label: 'Control mensual' },
    { value: 'OTRO', label: 'Otro' },
  ];

  // Cargar pacientes del nutriólogo para el select
  protected readonly pacientesResource = rxResource({
    stream: () => this.pacienteService.obtenerPacientes(0, 200),
  });

  // En modo edición cargamos la cita
  protected readonly citaResource = rxResource({
    params: () => {
      const id = this.citaId();
      return id ? { id } : undefined;
    },
    stream: ({ params }) => this.citaService.obtenerCitaPorId(params.id),
  });

  protected readonly form = this.fb.nonNullable.group({
    pacienteId: [0, [Validators.required, Validators.min(1)]],
    fechaHoraInicio: ['', Validators.required],
    fechaHoraFin: ['', Validators.required],
    motivoCita: ['PRIMERA_VEZ' as MotivoCita, Validators.required],
  });

  constructor() {
    // Poblar formulario en modo edición
    effect(() => {
      const cita = this.citaResource.value();
      if (!cita) return;

      this.form.patchValue({
        pacienteId: cita.pacienteId,
        fechaHoraInicio: this.isoToDatetimeLocal(cita.fechaHoraInicio),
        fechaHoraFin: this.isoToDatetimeLocal(cita.fechaHoraFin),
        motivoCita: cita.motivoCita,
      });
    });
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);

    const raw = this.form.getRawValue();
    const nutriologoId = this.authService.userId()!;

    const request = {
      pacienteId: raw.pacienteId,
      nutriologoId,
      fechaHoraInicio: this.datetimeLocalToIso(raw.fechaHoraInicio),
      fechaHoraFin: this.datetimeLocalToIso(raw.fechaHoraFin),
      motivoCita: raw.motivoCita,
    };

    const op$ = this.modoEdicion()
      ? this.citaService.actualizarCita(this.citaId()!, request)
      : this.citaService.crearCita(request);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const msg = this.modoEdicion()
          ? 'Cita actualizada correctamente'
          : 'Cita creada correctamente';
        this.notificationService.success(msg);
        this.router.navigate(['/main/citas'])
          .then(() => this.isSubmitting.set(false))
          .catch(() => this.isSubmitting.set(false));
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  private isoToDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private datetimeLocalToIso(datetimeLocal: string): string {
    return new Date(datetimeLocal).toISOString();
  }
}
