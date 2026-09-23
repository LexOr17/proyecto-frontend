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
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';

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
    fechaHoraInicio: ['', [Validators.required, FormValidatorHelper.fechaHoraFuturaValidator()]],
    fechaHoraFin: ['', Validators.required],
    motivoCita: ['PRIMERA_VEZ' as MotivoCita, Validators.required],
  }, { validators: [FormValidatorHelper.finPosteriorInicioValidator('fechaHoraInicio', 'fechaHoraFin')] });

  /** Valor mínimo para los inputs datetime-local (ahora mismo) */
  protected get minDatetime(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  constructor() {
    // Si viene pacienteId por queryParams (desde perfil de paciente), preseleccionarlo
    const qPacienteId = this.route.snapshot.queryParamMap.get('pacienteId');
    if (qPacienteId && !isNaN(Number(qPacienteId))) {
      this.form.patchValue({ pacienteId: Number(qPacienteId) });
    }

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
    // Verificar también error del grupo (cross-field) para fechaHoraFin
    if (field === 'fechaHoraFin' && (ctrl?.touched || ctrl?.dirty) && this.form.hasError('finAnteriorInicio')) {
      return true;
    }
    return FormValidatorHelper.isFieldInvalidTouchedOrDirty(ctrl);
  }

  protected getErrorMessage(field: string, label: string): string {
    if (field === 'fechaHoraFin' && (this.form.get(field)?.touched || this.form.get(field)?.dirty) && this.form.hasError('finAnteriorInicio')) {
      return 'La hora de fin debe ser posterior a la hora de inicio.';
    }
    return FormValidatorHelper.getErrorMessage(this.form.get(field), label);
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
      next: (res) => {

        const msg = this.modoEdicion()
          ? 'Cita actualizada correctamente'
          : 'Cita creada correctamente';
        this.notificationService.success(msg);
        this.router.navigate(['/main/citas'])
          .then(() => this.isSubmitting.set(false))
          .catch(() => this.isSubmitting.set(false));
      },
      error: (err) => {
        this.isSubmitting.set(false);
      },
    });
  }

  private isoToDatetimeLocal(iso: string): string {
    // Spring Boot serializes LocalDateTime as "YYYY-MM-DDTHH:MM:SS[.nanos]"
    // datetime-local input expects "YYYY-MM-DDTHH:MM" — just take the first 16 chars
    return iso.substring(0, 16);
  }

  private datetimeLocalToIso(datetimeLocal: string): string {
    // `datetime-local` returns a string without timezone (e.g. "2026-03-16T09:00").
    // Converting with `new Date(...).toISOString()` transforms it to UTC and
    // changes the hour. To preserve the hour the user selected, send the
    // local datetime string without converting to UTC (no trailing 'Z').
    return `${datetimeLocal}:00`;
  }

  protected onFechaInicioChange(): void {
    const val = this.form.controls.fechaHoraInicio.value;
    if (val) {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        date.setHours(date.getHours() + 1);
        const formatted = this.formatDateToLocalString(date);
        this.form.patchValue({ fechaHoraFin: formatted });
      }
    }
  }

  private formatDateToLocalString(date: Date): string {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const YYYY = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const DD = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
  }
}
