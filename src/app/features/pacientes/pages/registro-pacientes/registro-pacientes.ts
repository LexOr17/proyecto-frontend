import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PacienteService } from '../../service/paciente-service';
import { mapPacienteFormToRequest } from '../../mappers/paciente.mapper';
import { NotificationService } from '../../../../shared/service/notification-service';
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';

@Component({
  selector: 'app-registro-pacientes',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro-pacientes.html',
  styleUrl: './registro-pacientes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroPacientes {

  private readonly fb = inject(FormBuilder);
  private readonly pacienteService = inject(PacienteService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  // State Signals
  protected isSubmitting = signal(false);

  // Detectar ID de la ruta
  protected pacienteId = signal<number | null>(
    this.route.snapshot.paramMap.has('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : null
  );

  protected modoEdicion = computed(() => this.pacienteId() !== null);
  protected titulo = computed(() => this.modoEdicion() ? 'Editar Paciente' : 'Nuevo Paciente');

  // View references
  private telefonoInput = viewChild<ElementRef<HTMLInputElement>>('telefonoInput');

  // Formulario
  protected registroForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2), FormValidatorHelper.soloLetrasValidator()]],
    apellidoPaterno: ['', [Validators.required, Validators.minLength(2), FormValidatorHelper.soloLetrasValidator()]],
    apellidoMaterno: ['', [FormValidatorHelper.soloLetrasValidator()]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    fechaNacimiento: ['', [Validators.required, FormValidatorHelper.fechaPasadaValidator()]],
    genero: ['MASCULINO', [Validators.required]],
  });

  // rxResource: carga del paciente en modo edición
  protected pacienteResource = rxResource({
    params: () => {
      const id = this.pacienteId();
      return id ? { id } : undefined;
    },
    stream: ({ params }) => this.pacienteService.obtenerPacientePorId(params.id),
  });

  constructor() {
    // Poblar formulario cuando el paciente se carga en modo edición
    effect(() => {
      const paciente = this.pacienteResource.value();
      if (!paciente) return;

      this.registroForm.patchValue({
        nombre: paciente.nombre,
        apellidoPaterno: paciente.apellidoPaterno,
        apellidoMaterno: paciente.apellidoMaterno,
        correo: paciente.correo,
        telefono: paciente.telefono,
        fechaNacimiento: paciente.fechaNacimiento
          ? new Date(paciente.fechaNacimiento).toISOString().substring(0, 10)
          : '',
        genero: paciente.genero,
      });

      // Formatear visualmente el teléfono
      const inputEl = this.telefonoInput()?.nativeElement;
      if (inputEl && paciente.telefono) {
        inputEl.value = this.formatearTelefono(paciente.telefono);
      }
    });
  }

  protected onSubmit(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const rawValue = this.registroForm.getRawValue();
    const request = mapPacienteFormToRequest(rawValue);

    const operacion$ = this.modoEdicion()
      ? this.pacienteService.actualizarPaciente(this.pacienteId()!, request)
      : this.pacienteService.registrarPaciente(request);

    operacion$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const mensajeExito = this.modoEdicion()
            ? 'Paciente actualizado correctamente'
            : 'Paciente registrado correctamente';
          this.notificationService.success(mensajeExito);
          this.router.navigate(['/main/pacientes'])
            .then(() => this.isSubmitting.set(false))
            .catch(() => this.isSubmitting.set(false));
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
  }

  protected isInvalid(field: string): boolean {
    return FormValidatorHelper.isFieldInvalidTouchedOrDirty(this.registroForm.get(field));
  }

  protected getErrorMessage(field: string, label: string): string {
    return FormValidatorHelper.getErrorMessage(this.registroForm.get(field), label);
  }

  private formatearTelefono(telefono: string): string {
    const value = telefono.replace(/\D/g, '');
    if (value.length >= 3) {
      let formatted = `(${value.substring(0, 3)}`;
      if (value.length > 3) {
        formatted += `) ${value.substring(3, 6)}`;
        if (value.length > 6) {
          formatted += `-${value.substring(6, 10)}`;
        }
      }
      return formatted;
    }
    return value;
  }

  protected onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    const limitedValue = value.substring(0, 10);

    let formatted = limitedValue;
    if (limitedValue.length >= 3) {
      formatted = `(${limitedValue.substring(0, 3)}`;
      if (limitedValue.length > 3) {
        formatted += `) ${limitedValue.substring(3, 6)}`;
        if (limitedValue.length > 6) {
          formatted += `-${limitedValue.substring(6, 10)}`;
        }
      }
    }

    input.value = formatted;
    this.registroForm.get('telefono')?.setValue(limitedValue, { emitEvent: false });
  }

  protected limpiarFormulario(): void {
    this.registroForm.reset({
      genero: 'MASCULINO',
    });

    const inputEl = this.telefonoInput()?.nativeElement;
    if (inputEl) {
      inputEl.value = '';
    }
  }
}
