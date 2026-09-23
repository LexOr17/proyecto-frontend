import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CitaService } from '../../../citas/service/cita-service';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { AuthService } from '../../../../core/services/auth-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { MotivoCita } from '../../../citas/interfaces/cita.interface';
import { Paciente } from '../../../pacientes/interfaces/paciente.interface';

@Component({
  selector: 'app-modal-crear-cita',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './modal-crear-cita.html',
  styleUrl: './modal-crear-cita.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalCrearCita implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly citaService = inject(CitaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() fechaHoraInicioISO: string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() citaCreada = new EventEmitter<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly isLoadingPacientes = signal(false);
  protected readonly pacientes = signal<Paciente[]>([]);
  protected readonly searchPaciente = signal('');

  protected readonly motivosCita: { value: MotivoCita; label: string }[] = [
    { value: 'PRIMERA_VEZ', label: 'Primera Vez' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
    { value: 'REVISION_DE_PLAN', label: 'Revisión de Plan' },
    { value: 'NUEVO_SINTOMA', label: 'Nuevo Síntoma' },
    { value: 'CONTROL_MENSUAL', label: 'Control Mensual' },
    { value: 'OTRO', label: 'Otro' },
  ];

  protected readonly filteredPacientes = computed(() => {
    const term = this.searchPaciente().toLowerCase().trim();
    const list = this.pacientes();
    if (!term) return list;
    return list.filter((p) =>
      `${p.nombre} ${p.apellidoPaterno} ${p.apellidoMaterno ?? ''}`.toLowerCase().includes(term)
    );
  });

  protected readonly form = this.fb.nonNullable.group({
    pacienteId: [0, [Validators.required, Validators.min(1)]],
    fechaHoraInicio: ['', Validators.required],
    fechaHoraFin: ['', Validators.required],
    motivoCita: ['SEGUIMIENTO' as MotivoCita, Validators.required],
  });

  constructor() {
    this.cargarPacientes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fechaHoraInicioISO'] && this.fechaHoraInicioISO) {
      const inicio = new Date(this.fechaHoraInicioISO);
      const fin = new Date(inicio.getTime() + 60 * 60 * 1000); // +1 hora

      this.form.patchValue({
        fechaHoraInicio: this.formatDateToLocal(inicio),
        fechaHoraFin: this.formatDateToLocal(fin),
        motivoCita: 'SEGUIMIENTO',
        pacienteId: 0,
      });
      this.searchPaciente.set('');
    }
  }

  private cargarPacientes(): void {
    this.isLoadingPacientes.set(true);
    this.pacienteService
      .obtenerPacientes(0, 300)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.pacientes.set(page.content ?? []);
          this.isLoadingPacientes.set(false);
        },
        error: () => {
          this.isLoadingPacientes.set(false);
        },
      });
  }

  protected onFechaInicioChange(): void {
    const val = this.form.controls.fechaHoraInicio.value;
    if (val) {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        date.setHours(date.getHours() + 1);
        this.form.patchValue({ fechaHoraFin: this.formatDateToLocal(date) });
      }
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const nutriologoId = this.authService.userId();
    if (!nutriologoId) {
      this.notificationService.error('No se pudo identificar la sesión del nutriólogo.');
      return;
    }

    this.isSubmitting.set(true);

    const toIsoSeconds = (v: string) => (v.length === 16 ? `${v}:00` : v);

    const request = {
      pacienteId: Number(raw.pacienteId),
      nutriologoId,
      fechaHoraInicio: toIsoSeconds(raw.fechaHoraInicio),
      fechaHoraFin: toIsoSeconds(raw.fechaHoraFin),
      motivoCita: raw.motivoCita,
    };

    this.citaService
      .crearCita(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.success('¡Cita agendada exitosamente!');
          this.citaCreada.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg = err.error?.mensaje ?? 'Error al agendar la cita. Verifica que el horario esté libre.';
          this.notificationService.error(msg);
        },
      });
  }

  protected cerrar(): void {
    this.close.emit();
  }

  private formatDateToLocal(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const YYYY = date.getFullYear();
    const MM = pad(date.getMonth() + 1);
    const DD = pad(date.getDate());
    const HH = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
  }
}
