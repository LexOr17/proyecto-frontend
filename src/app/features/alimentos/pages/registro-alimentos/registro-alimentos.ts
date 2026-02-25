import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AlimentoService } from '../../service/alimento-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { mapAlimentoFormToRequest, buildAlimentoFormData } from '../../mappers/alimento.mapper';
import {
  CATEGORIAS_ALIMENTO,
  UNIDADES_PORCION,
} from '../../interfaces/alimento.interface';

@Component({
  selector: 'app-registro-alimentos',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro-alimentos.html',
  styleUrl: './registro-alimentos.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroAlimentos {
  private readonly fb = inject(FormBuilder);
  private readonly alimentoService = inject(AlimentoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly notificationService = inject(NotificationService);

  // Catálogos
  protected readonly categorias = CATEGORIAS_ALIMENTO;
  protected readonly unidades = UNIDADES_PORCION;

  // State
  protected isSubmitting = signal(false);
  protected selectedFile = signal<File | null>(null);
  protected imagePreview = signal<string | null>(null);

  // Detectar ID de la ruta (modo edición)
  protected alimentoId = signal<number | null>(
    this.route.snapshot.paramMap.has('id')
      ? Number(this.route.snapshot.paramMap.get('id'))
      : null
  );

  protected modoEdicion = computed(() => this.alimentoId() !== null);
  protected titulo = computed(() =>
    this.modoEdicion() ? 'Editar Alimento' : 'Nuevo Alimento'
  );

  // Formulario reactivo (sin imagenUrl, la imagen va como File aparte)
  protected registroForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    categoria: ['', [Validators.required]],
    calorias: ['', [Validators.required, Validators.min(0), Validators.max(9999.99)]],
    proteina: ['', [Validators.required, Validators.min(0), Validators.max(999.99)]],
    carbohidratos: ['', [Validators.required, Validators.min(0), Validators.max(999.99)]],
    grasas: ['', [Validators.required, Validators.min(0), Validators.max(999.99)]],
    porcionBase: ['', [Validators.required, Validators.min(0.01), Validators.max(9999.99)]],
    unidadPorcion: ['', [Validators.required]],
  });

  // rxResource: carga del alimento en modo edición
  protected alimentoResource = rxResource({
    params: () => {
      const id = this.alimentoId();
      return id ? { id } : undefined;
    },
    stream: ({ params }) => this.alimentoService.obtenerAlimentoPorId(params.id),
  });

  constructor() {
    // Poblar el formulario cuando se carga el alimento en modo edición
    const checkResource = setInterval(() => {
      const alimento = this.alimentoResource.value();
      if (alimento) {
        this.registroForm.patchValue({
          nombre: alimento.nombre,
          categoria: alimento.categoria,
          calorias: String(alimento.calorias),
          proteina: String(alimento.proteina),
          carbohidratos: String(alimento.carbohidratos),
          grasas: String(alimento.grasas),
          porcionBase: String(alimento.porcionBase),
          unidadPorcion: alimento.unidadPorcion,
        });

        // Si tiene imagen, mostrar preview de la URL existente
        if (alimento.imagenUrl) {
          this.imagePreview.set(alimento.imagenUrl);
        }

        clearInterval(checkResource);
      }
    }, 100);

    this.destroyRef.onDestroy(() => clearInterval(checkResource));
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.notificationService.error('Solo se permiten imágenes JPG, PNG o WebP');
      input.value = '';
      return;
    }

    // Validar tamaño (máx 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.notificationService.error('La imagen no debe superar los 5MB');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);

    // Generar preview
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  protected removeImage(): void {
    this.selectedFile.set(null);
    this.imagePreview.set(null);
  }

  protected onSubmit(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const rawValue = this.registroForm.getRawValue();
    const request = mapAlimentoFormToRequest(rawValue);
    const formData = buildAlimentoFormData(request, this.selectedFile());

    const operacion$ = this.modoEdicion()
      ? this.alimentoService.actualizarAlimento(this.alimentoId()!, formData)
      : this.alimentoService.registrarAlimento(formData);

    operacion$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const mensajeExito = this.modoEdicion()
          ? 'Alimento actualizado correctamente'
          : 'Alimento registrado correctamente';
        this.notificationService.success(mensajeExito);
        this.router
          .navigate(['/main/alimentos'])
          .then(() => this.isSubmitting.set(false))
          .catch(() => this.isSubmitting.set(false));
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  protected isInvalid(field: string): boolean {
    const ctrl = this.registroForm.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty));
  }

  protected limpiarFormulario(): void {
    this.registroForm.reset();
    this.selectedFile.set(null);
    this.imagePreview.set(null);
  }
}
