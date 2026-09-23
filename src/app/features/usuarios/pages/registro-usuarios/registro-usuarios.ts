import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { UsuarioService } from '../../service/usuario-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { mapRegistroFormToRequest } from '../../mappers/usuario.mapper';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '../../../../shared/service/notification-service';

@Component({
  selector: 'app-registro-usuarios',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro-usuarios.html',
  styleUrl: './registro-usuarios.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroUsuarios {

  private readonly fb = inject(FormBuilder);
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  // State Signals
  protected isSubmitting = signal(false);
  protected rolSeleccionado = signal<string>('PACIENTE');

  // Detectar ID de la ruta
  protected usuarioId = signal<number | null>(
    this.route.snapshot.paramMap.has('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : null
  );

  protected modoEdicion = computed(() => this.usuarioId() !== null);
  protected titulo = computed(() => this.modoEdicion() ? 'Editar Usuario' : 'Nuevo Usuario');

  // View references
  private telefonoInput = viewChild<ElementRef<HTMLInputElement>>('telefonoInput');

  // Formulario
  protected registroForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellidoPaterno: ['', [Validators.required]],
    apellidoMaterno: [''],
    correo: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    fechaNacimiento: ['', [Validators.required, fechaPasadaValidator()]],
    genero: ['MASCULINO', [Validators.required]],
    rol: ['PACIENTE', [Validators.required]],
    cedulaProfesional: [''],
    nutriologoId: ['' as string | number],
  });

  // rxResource: carga del usuario en modo edición
  protected usuarioResource = rxResource({
    params: () => {
      const id = this.usuarioId();
      return id ? { id } : undefined;
    },
    stream: ({ params }) => this.usuarioService.obtenerUsuarioPorId(params.id),
  });

  // rxResource: carga de nutriólogos cuando el rol es PACIENTE
  protected nutriologosResource = rxResource({
    params: () => {
      const rol = this.rolSeleccionado();
      return rol === 'PACIENTE' ? {} : undefined;
    },
    stream: () => this.usuarioService.obtenerNutriologos(),
  });

  constructor() {
    // Sincronizar cambios del FormControl 'rol' con la signal
    this.registroForm.get('rol')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(rol => {
        this.rolSeleccionado.set(rol ?? 'PACIENTE');
        this.actualizarValidacionesPorRol(rol);
      });

    // Poblar formulario cuando el usuario se carga en modo edición
    effect(() => {
      const usuario = this.usuarioResource.value();
      if (!usuario) return;

      this.registroForm.patchValue({
        nombre: usuario.nombre,
        apellidoPaterno: usuario.apellidoPaterno,
        apellidoMaterno: usuario.apellidoMaterno,
        correo: usuario.correo,
        telefono: usuario.telefono,
        fechaNacimiento: usuario.fechaNacimiento
          ? new Date(usuario.fechaNacimiento).toISOString().substring(0, 10)
          : '',
        genero: usuario.genero,
        rol: usuario.rol,
        cedulaProfesional: usuario.cedulaProfesional || '',
        nutriologoId: usuario.nutriologoId || '',
      });

      this.rolSeleccionado.set(usuario.rol);

      // Formatear visualmente el teléfono
      const inputEl = this.telefonoInput()?.nativeElement;
      if (inputEl && usuario.telefono) {
        inputEl.value = this.formatearTelefono(usuario.telefono);
      }
    });

    // Inicialización de validaciones basada en el valor actual
    this.actualizarValidacionesPorRol(this.registroForm.get('rol')?.value);
  }

  // Esta lógica UI se queda aquí porque manipula el formulario directamente
  private actualizarValidacionesPorRol(rol: string | null | undefined) {
    const cedulaCtrl = this.registroForm.get('cedulaProfesional');
    const nutriologoCtrl = this.registroForm.get('nutriologoId');

    // Resetear estado
    cedulaCtrl?.clearValidators();
    nutriologoCtrl?.clearValidators();
    cedulaCtrl?.setValue('');
    nutriologoCtrl?.setValue('');

    // Aplicar lógica condicional
    if (rol === 'NUTRIOLOGO') {
      cedulaCtrl?.setValidators([Validators.required, Validators.pattern('^[0-9]{8}$')]);
    } else if (rol === 'PACIENTE') {
      nutriologoCtrl?.setValidators([Validators.required]);
    }

    cedulaCtrl?.updateValueAndValidity();
    nutriologoCtrl?.updateValueAndValidity();
  }

  protected onSubmit() {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    // 1. Obtener datos crudos
    const rawValue = this.registroForm.getRawValue();

    // 2. Usar el MAPPER puro (importado)
    const request = mapRegistroFormToRequest(rawValue);

    // 3. Decidir entre crear o actualizar
    const operacion$ = this.modoEdicion()
      ? this.usuarioService.actualizarUsuario(this.usuarioId()!, request)
      : this.usuarioService.registrarUsuario(request);

    operacion$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const mensajeExito = this.modoEdicion()
            ? 'Usuario actualizado correctamente'
            : 'Usuario registrado correctamente';
          this.notificationService.success(mensajeExito);
          this.router.navigate(['/main/usuarios'])
            .then(() => this.isSubmitting.set(false))
            .catch(() => this.isSubmitting.set(false));
        },
        error: () => {
          this.isSubmitting.set(false);
        }
      });
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.registroForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
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
    const value = input.value.replace(/\D/g, ''); // Solo números

    // Limitar a 10 dígitos
    const limitedValue = value.substring(0, 10);

    // Formatear visualmente: (xxx) xxx-xxxx
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

    // Actualizar el input con el formato visual
    input.value = formatted;

    // Guardar solo los números en el formulario
    this.registroForm.get('telefono')?.setValue(limitedValue, { emitEvent: false });
  }

  protected onCedulaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, ''); // Solo números
    const limitedValue = value.substring(0, 8); // Máximo 8 dígitos
    input.value = limitedValue;
    this.registroForm.get('cedulaProfesional')?.setValue(limitedValue, { emitEvent: false });
  }

  protected limpiarFormulario(): void {
    this.registroForm.reset({
      genero: 'MASCULINO',
      rol: 'PACIENTE',
      cedulaProfesional: '',
      nutriologoId: '',
    });

    const inputEl = this.telefonoInput()?.nativeElement;
    if (inputEl) {
      inputEl.value = '';
    }
  }

}

function fechaPasadaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const selectedDate = new Date(control.value + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate < today ? null : { fechaFutura: true };
  };
}
