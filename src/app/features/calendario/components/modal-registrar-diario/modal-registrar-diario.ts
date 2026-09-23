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
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DiarioComidaService } from '../../../diario/service/diario-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import {
  EstadoRegistro,
  HORARIOS_LABEL,
  TipoComidaDiario,
} from '../../../diario/interfaces/diario.interface';
import { ComidaProgramadaCalendario, RegistroDiarioCalendario } from '../../interfaces/calendario.interface';

@Component({
  selector: 'app-modal-registrar-diario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './modal-registrar-diario.html',
  styleUrl: './modal-registrar-diario.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalRegistrarDiario implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly diarioService = inject(DiarioComidaService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) comida!: ComidaProgramadaCalendario;
  @Input({ required: true }) fecha!: string; // YYYY-MM-DD
  @Input() registroExistente?: RegistroDiarioCalendario | null;
  @Output() close = new EventEmitter<void>();
  @Output() diarioRegistrado = new EventEmitter<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly horariosLabel: Record<string, string> = HORARIOS_LABEL;

  protected getHorarioLabel(horario: string): string {
    return this.horariosLabel[horario as TipoComidaDiario] || horario;
  }

  protected readonly form = this.fb.nonNullable.group({
    estado: ['CUMPLIDO' as EstadoRegistro, Validators.required],
    detallesComidaReal: ['', Validators.maxLength(255)],
  });

  ngOnInit(): void {
    this.initFormData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['comida'] || changes['registroExistente']) && !changes['comida']?.firstChange) {
      this.initFormData();
    }
  }

  private initFormData(): void {
    if (this.registroExistente) {
      this.form.patchValue({
        estado: (this.registroExistente.estado as EstadoRegistro) || 'CUMPLIDO',
      });
    } else {
      this.form.reset({
        estado: 'CUMPLIDO',
        detallesComidaReal: '',
      });
    }
    this.updateDetallesValidation(this.form.controls.estado.value);
  }

  protected setEstado(estado: EstadoRegistro): void {
    this.form.patchValue({ estado });
    this.updateDetallesValidation(estado);
  }

  private updateDetallesValidation(estado: EstadoRegistro): void {
    const ctrl = this.form.controls.detallesComidaReal;
    if (estado === 'MODIFICADO') {
      ctrl.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      ctrl.clearValidators();
      ctrl.setValidators([Validators.maxLength(255)]);
    }
    ctrl.updateValueAndValidity();
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (this.fecha > todayStr) {
      this.notificationService.warning('No es posible registrar comidas en fechas futuras.');
      return;
    }

    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();

    const request = {
      comidaProgramadaId: this.comida.id,
      fecha: this.fecha,
      horario: this.comida.horario as TipoComidaDiario,
      estado: raw.estado,
      detallesComidaReal: raw.detallesComidaReal?.trim() || null,
    };

    const isEdit = !!(this.registroExistente && this.registroExistente.id);
    const request$ = isEdit
      ? this.diarioService.actualizar(this.registroExistente!.id, request)
      : this.diarioService.registrar(request);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notificationService.success(
          isEdit ? '¡Registro de comida actualizado!' : '¡Comida registrada en tu diario!'
        );
        this.diarioRegistrado.emit();
        this.close.emit();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.notificationService.error(err.error?.mensaje ?? 'Error al guardar el registro de la comida.');
      },
    });
  }

  protected cerrar(): void {
    this.close.emit();
  }
}
