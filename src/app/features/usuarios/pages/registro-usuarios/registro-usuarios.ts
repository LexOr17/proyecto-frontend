import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../../service/usuario-service';
import { Router } from '@angular/router';
import { Dato } from '../../interfaces/usuario-request';
import { mapRegistroFormToRequest } from '../../mappers/usuario.mapper';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-registro-usuarios',
  imports: [ReactiveFormsModule],
  templateUrl: './registro-usuarios.html',
  styleUrls: ['./registro-usuarios.css'],
})
export class RegistroUsuarios implements OnInit {

  private fb = inject(FormBuilder);
  private usuarioService = inject(UsuarioService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  // State Signals
  protected isLoading = signal(false);
  protected nutriologosList = signal<Dato[]>([]);
  protected errorMessage = signal<string | null>(null);

  // Formulario
  registroForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellidoPaterno: ['', [Validators.required]],
    apellidoMaterno: [''],
    correo: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    fechaNacimiento: ['', [Validators.required]],
    genero: ['MASCULINO', [Validators.required]],
    rol: ['PACIENTE', [Validators.required]],
    cedulaProfesional: [''],
    nutriologoId: [null as number | null],
  });

  constructor() {
    this.registroForm.get('rol')?.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(rol => this.actualizarValidacionesPorRol(rol));
  }

  ngOnInit(): void {
    // Inicialización correcta basada en el valor actual
    const rolActual = this.registroForm.get('rol')?.value;
    this.actualizarValidacionesPorRol(rolActual);
  }

  // Esta lógica UI se queda aquí porque manipula el formulario directamente
  actualizarValidacionesPorRol(rol: string | null | undefined) {
    const cedulaCtrl = this.registroForm.get('cedulaProfesional');
    const nutriologoCtrl = this.registroForm.get('nutriologoId');

    // Resetear estado
    cedulaCtrl?.clearValidators();
    nutriologoCtrl?.clearValidators();
    cedulaCtrl?.setValue('');
    nutriologoCtrl?.setValue(null);

    // Aplicar lógica condicional
    if (rol === 'NUTRIOLOGO') {
      cedulaCtrl?.setValidators([Validators.required]);
    } else if (rol === 'PACIENTE') {
      nutriologoCtrl?.setValidators([Validators.required]);
      this.cargarNutriologos();
    }

    cedulaCtrl?.updateValueAndValidity();
    nutriologoCtrl?.updateValueAndValidity();
  }

  cargarNutriologos() {
    if (this.nutriologosList().length > 0) return;

    this.usuarioService.obtenerNutriologos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.nutriologosList.set(data),
        error: () => this.errorMessage.set('Error al cargar nutriólogos')
      });
  }

  onSubmit() {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // 1. Obtener datos crudos
    const rawValue = this.registroForm.getRawValue();

    // 2. Usar el MAPPER puro (importado)
    const request = mapRegistroFormToRequest(rawValue);

    // 3. Llamar al servicio
    this.usuarioService.registrarUsuario(request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/main/dashboard']);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('No se pudo registrar el usuario.');
      }
    });
  }

  // Helper visual para el template
  isInvalid(field: string): boolean {
    const ctrl = this.registroForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  //   private fb = inject(FormBuilder);
  //   private usuarioService = inject(UsuarioService);
  //   private router = inject(Router);

  //   // State Signals
  //   protected isLoading = signal(false);
  //   protected nutriologosList = signal<Dato[]>([]);
  //   protected errorMessage = signal<string | null>(null);

  //   // Formulario Reactivo
  //   registroForm = this.fb.group({
  //     nombre: ['', [Validators.required, Validators.minLength(2)]],
  //     apellidoPaterno: ['', [Validators.required]],
  //     apellidoMaterno: '',
  //     correo: ['', [Validators.required, Validators.email]],
  //     telefono: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
  //     fechaNacimiento: ['', [Validators.required]],
  //     genero: ['MASCULINO', [Validators.required]],
  //     rol: ['PACIENTE', [Validators.required]],
  //     cedulaProfesional: [''],
  //     nutriologoId: ['']
  //   });

  //   // Signal computada o helper para el template (para evitar llamar funciones complejas)
  //   // En este caso, usamos un getter simple o accedemos directo al control en el template
  //   get rolSeleccionado() {
  //     return this.registroForm.get('rol')?.value;
  //   }

  //   ngOnInit(): void {
  //     // Suscripción a cambios del rol
  //     this.registroForm.get('rol')?.valueChanges.subscribe(rol => {
  //       this.actualizarValidacionesPorRol(rol);
  //     });

  //     // Cargar validaciones iniciales
  //     this.actualizarValidacionesPorRol(this.rolSeleccionado);
  //   }

  //   actualizarValidacionesPorRol(rol: string | null | undefined) {
  //     const cedulaCtrl = this.registroForm.get('cedulaProfesional');
  //     const nutriologoCtrl = this.registroForm.get('nutriologoId');

  //     // Limpiar
  //     cedulaCtrl?.clearValidators();
  //     nutriologoCtrl?.clearValidators();
  //     cedulaCtrl?.setValue('');
  //     nutriologoCtrl?.setValue('');

  //     if (rol === 'NUTRIOLOGO') {
  //       cedulaCtrl?.setValidators([Validators.required]);
  //     } else if (rol === 'PACIENTE') {
  //       nutriologoCtrl?.setValidators([Validators.required]);
  //       this.cargarNutriologos();
  //     }

  //     cedulaCtrl?.updateValueAndValidity();
  //     nutriologoCtrl?.updateValueAndValidity();
  //   }

  //   cargarNutriologos() {
  //     if (this.nutriologosList().length === 0) {
  //       this.usuarioService.obtenerNutriologos().subscribe({
  //         next: (data) => this.nutriologosList.set(data),
  //         error: (err) => console.error(err)
  //       });
  //     }
  //   }

  //   onSubmit() {

  //     console.log('Intento de envío...');

  //     if (this.registroForm.invalid) {
  //       this.registroForm.markAllAsTouched();
  //       return;
  //     }

  //     this.isLoading.set(true);
  //     this.errorMessage.set(null);

  //     // Casting seguro porque validamos el form
  //     const request = this.registroForm.getRawValue() as any; 

  //     this.usuarioService.registrarUsuario(request).subscribe({
  //       next: () => {
  //         this.isLoading.set(false);
  //         this.router.navigate(['/main/dashboard']); // Ajustado a tu ruta layout
  //       },
  //       error: () => {
  //         this.isLoading.set(false);
  //         this.errorMessage.set('No se pudo registrar el usuario.');
  //       }
  //     });
  //   }

  //   // Helpers visuales
  //   isInvalid(field: string): boolean {
  //     const ctrl = this.registroForm.get(field);
  //     return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  //   }

  //   getAllErrors() {
  //   const errors: any = {};
  //   Object.keys(this.registroForm.controls).forEach(key => {
  //     const controlErrors = this.registroForm.get(key)?.errors;
  //     if (controlErrors) {
  //       errors[key] = controlErrors;
  //     }
  //   });
  //   return errors;
  // }

}
