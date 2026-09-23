import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { DiarioExtendidoService } from '../../../diario-extendido/service/diario-extendido-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import {
  BebidaConsumida,
  CALIDAD_SUENO_MAP,
  CalidadSueno,
  DiarioExtendidoResponse,
  ESTADO_ANIMO_MAP,
  EstadoAnimo,
  SINTOMA_LABEL,
  Sintoma,
  TIPO_ACTIVIDAD_LABEL,
} from '../../../diario-extendido/interfaces/diario-extendido.interface';

@Component({
  selector: 'app-modal-registrar-bienestar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './modal-registrar-bienestar.html',
  styleUrl: './modal-registrar-bienestar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalRegistrarBienestar implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly bienestarService = inject(DiarioExtendidoService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) fecha!: string; // YYYY-MM-DD
  @Output() close = new EventEmitter<void>();
  @Output() bienestarRegistrado = new EventEmitter<void>();

  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly sugerenciaData = signal<DiarioExtendidoResponse | null>(null);
  protected readonly bebidas = signal<BebidaConsumida[]>([]);

  protected readonly animoMap = ESTADO_ANIMO_MAP;
  protected readonly suenoMap = CALIDAD_SUENO_MAP;
  protected readonly sintomaLabel = SINTOMA_LABEL;
  protected readonly tipoActividadLabel = TIPO_ACTIVIDAD_LABEL;

  protected readonly animos: EstadoAnimo[] = ['FELIZ', 'NORMAL', 'CANSADO', 'ANSIOSO', 'TRISTE'];
  protected readonly suenos: CalidadSueno[] = ['EXCELENTE', 'BUENA', 'REGULAR', 'MALA'];
  protected readonly sintomasList: { value: Sintoma; label: string }[] = Object.entries(SINTOMA_LABEL).map(
    ([k, v]) => ({ value: k as Sintoma, label: v })
  );

  protected readonly form = this.fb.group({
    estadoAnimo: this.fb.control<EstadoAnimo | null>(null, [Validators.required]),
    calidadSueno: this.fb.control<CalidadSueno | null>(null, [Validators.required]),
    sintomaPrincipal: this.fb.control<Sintoma | null>(null, [Validators.required]),
    sintomaDetalle: this.fb.control('', { nonNullable: true }),
    actividadRealizada: this.fb.control<boolean | null>(null),
    bebidasNombre: this.fb.control('', { nonNullable: true }),
    bebidasCantidad: this.fb.control<number | null>(null),
  });

  private readonly formValues = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  protected readonly sugerenciaTexto = computed(() => {
    const d = this.sugerenciaData();
    if (!d?.tipoActividadSugerida || d.tipoActividadSugerida === 'NINGUNA') return null;
    const label = TIPO_ACTIVIDAD_LABEL[d.tipoActividadSugerida];
    return d.actividadDetalle ? `${label}: ${d.actividadDetalle}` : label;
  });

  protected readonly isFormIncomplete = computed(() => {
    const v = this.formValues();
    if (!v.estadoAnimo || !v.calidadSueno || !v.sintomaPrincipal) return true;
    if (v.sintomaPrincipal === 'OTRO' && !v.sintomaDetalle?.trim()) return true;
    if (this.sugerenciaTexto() && (v.actividadRealizada === null || v.actividadRealizada === undefined)) return true;
    return false;
  });

  ngOnInit(): void {
    if (this.fecha) {
      this.cargarDatosDia();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fecha'] && this.fecha && !changes['fecha'].firstChange) {
      this.cargarDatosDia();
    }
  }

  private cargarDatosDia(): void {
    this.isLoading.set(true);
    this.bienestarService
      .obtenerMiDiarioPorFecha(this.fecha)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (diario) => {
          this.isLoading.set(false);
          if (diario && diario.estadoAnimo) {
            this.sugerenciaData.set(diario);
            this.form.patchValue({
              estadoAnimo: diario.estadoAnimo,
              calidadSueno: diario.calidadSueno,
              sintomaPrincipal: diario.sintomaPrincipal,
              sintomaDetalle: diario.sintomaDetalle || '',
              actividadRealizada: diario.actividadRealizada ?? null,
            });
            this.bebidas.set(diario.bebidas || []);
          } else {
            this.sugerenciaData.set(diario ?? null);
            this.form.reset({
              estadoAnimo: null,
              calidadSueno: null,
              sintomaPrincipal: null,
              sintomaDetalle: '',
              actividadRealizada: null,
              bebidasNombre: '',
              bebidasCantidad: null,
            });
            this.bebidas.set([]);
          }
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  protected setAnimo(animo: EstadoAnimo): void {
    this.form.controls.estadoAnimo.setValue(animo);
    this.form.controls.estadoAnimo.markAsTouched();
  }

  protected setSueno(sueno: CalidadSueno): void {
    this.form.controls.calidadSueno.setValue(sueno);
    this.form.controls.calidadSueno.markAsTouched();
  }

  protected setActividad(realizada: boolean): void {
    this.form.controls.actividadRealizada.setValue(realizada);
    this.form.controls.actividadRealizada.markAsTouched();
  }

  protected onSintomaSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value as Sintoma;
    this.form.controls.sintomaPrincipal.setValue(val || null);
    this.form.controls.sintomaPrincipal.markAsTouched();
    const detalleCtrl = this.form.controls.sintomaDetalle;
    if (val === 'OTRO') {
      detalleCtrl.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      detalleCtrl.clearValidators();
      detalleCtrl.setValue('');
    }
    detalleCtrl.updateValueAndValidity();
  }

  protected addBebida(): void {
    const nombre = this.form.controls.bebidasNombre.value.trim();
    const cantidad = this.form.controls.bebidasCantidad.value;
    if (!nombre || !cantidad || cantidad <= 0) {
      this.notificationService.warning('Ingresa un nombre y cantidad válida en ml.');
      return;
    }
    this.bebidas.update((list) => [...list, { nombre, cantidad }]);
    this.form.controls.bebidasNombre.setValue('');
    this.form.controls.bebidasCantidad.setValue(null);
  }

  protected removeBebida(index: number): void {
    this.bebidas.update((list) => list.filter((_, i) => i !== index));
  }

  protected onSubmit(): void {
    const todayStr = new Date().toLocaleDateString('en-CA');
    if (this.fecha > todayStr) {
      this.notificationService.warning('No es posible registrar el bienestar en fechas futuras.');
      return;
    }

    this.form.markAllAsTouched();
    const raw = this.form.getRawValue();

    if (!raw.estadoAnimo) {
      this.notificationService.warning('Por favor, selecciona cómo te sientes hoy.');
      return;
    }
    if (!raw.calidadSueno) {
      this.notificationService.warning('Por favor, indica tu calidad de descanso.');
      return;
    }
    if (!raw.sintomaPrincipal) {
      this.notificationService.warning('Por favor, selecciona un síntoma o indica "Ninguno".');
      return;
    }
    if (raw.sintomaPrincipal === 'OTRO' && !raw.sintomaDetalle?.trim()) {
      this.notificationService.warning('Por favor, especifica los detalles de tu síntoma.');
      return;
    }
    if (this.sugerenciaTexto() && raw.actividadRealizada === null) {
      this.notificationService.warning('Por favor, indica si realizaste la actividad física sugerida.');
      return;
    }

    this.isSubmitting.set(true);

    const request = {
      fecha: this.fecha,
      estadoAnimo: raw.estadoAnimo,
      calidadSueno: raw.calidadSueno,
      sintomaPrincipal: raw.sintomaPrincipal,
      sintomaDetalle: raw.sintomaDetalle?.trim() || undefined,
      actividadRealizada: this.sugerenciaTexto() ? (raw.actividadRealizada ?? undefined) : undefined,
      bebidas: this.bebidas(),
    };

    this.bienestarService
      .registrarDiario(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.success('¡Registro de bienestar guardado exitosamente!');
          this.bienestarRegistrado.emit();
          this.close.emit();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.notificationService.error(err.error?.mensaje ?? 'Error al registrar el bienestar.');
        },
      });
  }

  protected cerrar(): void {
    this.close.emit();
  }
}
