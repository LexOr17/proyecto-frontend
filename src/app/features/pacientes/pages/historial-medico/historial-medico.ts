import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HistorialMedicoService } from '../../service/historial-medico-service';
import { MedidaAntropometricaService } from '../../service/medida-antropometrica-service';
import { PacienteService } from '../../service/paciente-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import {
  EnfermedadEnum,
  EstadoMedicamento,
  HistorialMedicoItem,
  HistorialMedicoRequest,
  SintomaEnum,
} from '../../interfaces/historial-medico.interface';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

const ENFERMEDADES_OPTIONS: { value: EnfermedadEnum; label: string }[] = [
  { value: 'DIABETES_TIPO_1', label: 'Diabetes Tipo 1' },
  { value: 'DIABETES_TIPO_2', label: 'Diabetes Tipo 2' },
  { value: 'HIPOTIROIDISMO', label: 'Hipotiroidismo' },
  { value: 'HIPERTIROIDISMO', label: 'Hipertiroidismo' },
  { value: 'SINDROME_METABOLICO', label: 'Síndrome Metabólico' },
  { value: 'OBESIDAD', label: 'Obesidad' },
  { value: 'HIPERTENSION', label: 'Hipertensión' },
  { value: 'ENFERMEDAD_CARDIACA', label: 'Enfermedad Cardíaca' },
  { value: 'INSUFICIENCIA_CARDIACA', label: 'Insuficiencia Cardíaca' },
  { value: 'COLESTEROL_ALTO', label: 'Colesterol Alto' },
  { value: 'TRIGLICERIDOS_ALTOS', label: 'Triglicéridos Altos' },
  { value: 'ASMA', label: 'Asma' },
  { value: 'EPOC', label: 'EPOC' },
  { value: 'RINITIS_ALERGICA', label: 'Rinitis Alérgica' },
  { value: 'ENFERMEDAD_HEPATICA', label: 'Enfermedad Hepática' },
  { value: 'HIGADO_GRASO', label: 'Hígado Graso' },
  { value: 'ENFERMEDAD_RENAL', label: 'Enfermedad Renal' },
  { value: 'COLITIS', label: 'Colitis' },
  { value: 'GASTRITIS', label: 'Gastritis' },
  { value: 'SINDROME_INTESTINO_IRRITABLE', label: 'Síndrome de Intestino Irritable' },
  { value: 'ARTRITIS', label: 'Artritis' },
  { value: 'OSTEOPOROSIS', label: 'Osteoporosis' },
  { value: 'GOTA', label: 'Gota' },
  { value: 'CANCER', label: 'Cáncer' },
  { value: 'VIH_SIDA', label: 'VIH/SIDA' },
  { value: 'NINGUNA', label: 'Ninguna' },
  { value: 'OTRA', label: 'Otra' },
];

const SINTOMAS_OPTIONS: { value: SintomaEnum; label: string }[] = [
  { value: 'FIEBRE', label: 'Fiebre' },
  { value: 'CANSANCIO_FATIGA', label: 'Cansancio / Fatiga' },
  { value: 'PERDIDA_DE_PESO', label: 'Pérdida de Peso' },
  { value: 'AUMENTO_DE_PESO', label: 'Aumento de Peso' },
  { value: 'SUDORACION_EXCESIVA', label: 'Sudoración Excesiva' },
  { value: 'DEBILIDAD_GENERAL', label: 'Debilidad General' },
  { value: 'NAUSEAS', label: 'Náuseas' },
  { value: 'VOMITO', label: 'Vómito' },
  { value: 'DIARREA', label: 'Diarrea' },
  { value: 'ESTRENIMIENTO', label: 'Estreñimiento' },
  { value: 'DOLOR_ABDOMINAL', label: 'Dolor Abdominal' },
  { value: 'DISTENSION_ABDOMINAL', label: 'Distensión Abdominal' },
  { value: 'REFLUJO', label: 'Reflujo' },
  { value: 'PERDIDA_DE_APETITO', label: 'Pérdida de Apetito' },
  { value: 'AUMENTO_DE_APETITO', label: 'Aumento de Apetito' },
  { value: 'DIFICULTAD_PARA_RESPIRAR', label: 'Dificultad para Respirar' },
  { value: 'DOLOR_EN_EL_PECHO', label: 'Dolor en el Pecho' },
  { value: 'PALPITACIONES', label: 'Palpitaciones' },
  { value: 'TOS', label: 'Tos' },
  { value: 'CONGESTION_NASAL', label: 'Congestión Nasal' },
  { value: 'DOLOR_DE_CABEZA', label: 'Dolor de Cabeza' },
  { value: 'MAREO', label: 'Mareo' },
  { value: 'INSOMNIO', label: 'Insomnio' },
  { value: 'ANSIEDAD', label: 'Ansiedad' },
  { value: 'DEPRESION', label: 'Depresión' },
  { value: 'DOLOR_MUSCULAR', label: 'Dolor Muscular' },
  { value: 'DOLOR_ARTICULAR', label: 'Dolor Articular' },
  { value: 'CALAMBRES', label: 'Calambres' },
  { value: 'INFLAMACION', label: 'Inflamación' },
  { value: 'SED_EXCESIVA', label: 'Sed Excesiva' },
  { value: 'ORINA_FRECUENTE', label: 'Orina Frecuente' },
  { value: 'CAMBIOS_EN_LA_PIEL', label: 'Cambios en la Piel' },
  { value: 'CAIDA_DE_CABELLO', label: 'Caída de Cabello' },
  { value: 'NINGUNO', label: 'Ninguno' },
  { value: 'OTRO', label: 'Otro' },
];

const ENFERMEDAD_LABEL: Record<EnfermedadEnum, string> = Object.fromEntries(
  ENFERMEDADES_OPTIONS.map(o => [o.value, o.label])
) as Record<EnfermedadEnum, string>;

const SINTOMA_LABEL: Record<SintomaEnum, string> = Object.fromEntries(
  SINTOMAS_OPTIONS.map(o => [o.value, o.label])
) as Record<SintomaEnum, string>;

@Component({
  selector: 'app-historial-medico-paciente',
  imports: [ReactiveFormsModule, RouterLink, ConfirmDialog, Pagination],
  templateUrl: './historial-medico.html',
  styleUrl: './historial-medico.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialMedicoPaciente {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly historialService = inject(HistorialMedicoService);
  private readonly medidaService = inject(MedidaAntropometricaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly pacienteId = signal<number>(
    Number(this.route.snapshot.paramMap.get('id'))
  );

  protected readonly enfermedadesOptions = ENFERMEDADES_OPTIONS;
  protected readonly sintomasOptions = SINTOMAS_OPTIONS;
  protected readonly estadoMedicamentoOptions: { value: EstadoMedicamento; label: string }[] = [
    { value: 'NUNCA', label: 'Nunca ha tomado medicamentos o suplementos' },
    { value: 'ACTUALMENTE', label: 'Actualmente toma medicamentos o suplementos' },
    { value: 'ANTERIORMENTE', label: 'Anteriormente tomó medicamentos o suplementos' },
  ];

  protected isSubmitting = signal(false);
  protected editingId = signal<number | null>(null);
  protected editingFecha = signal<string>('');
  protected modoEdicion = computed(() => this.editingId() !== null);

  protected selectedEnfermedades = signal<EnfermedadEnum[]>([]);
  protected selectedSintomas = signal<SintomaEnum[]>([]);
  protected estadoMedicamento = signal<EstadoMedicamento>('NUNCA');

  protected showOtraEnfermedad = computed(() => this.selectedEnfermedades().includes('OTRA'));
  protected showOtroSintoma = computed(() => this.selectedSintomas().includes('OTRO'));
  protected showDescripcionMedicamento = computed(() => this.estadoMedicamento() !== 'NUNCA');

  protected currentPage = signal(0);
  protected currentSize = signal(10);

  protected pacienteResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) => this.pacienteService.obtenerPacientePorId(params.id),
  });

  protected ultimaMedidaResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) => this.medidaService.obtenerUltimaMedida(params.id),
  });

  protected historialResource = rxResource({
    params: () => ({
      pacienteId: this.pacienteId(),
      page: this.currentPage(),
      size: this.currentSize(),
    }),
    stream: ({ params }) =>
      this.historialService.listar(params.pacienteId, params.page, params.size),
  });

  protected nombreCompleto = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return '';
    return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
  });

  protected form = this.fb.nonNullable.group({
    otraEnfermedad: [''],
    alergias: [''],
    otroSintoma: [''],
    descripcionMedicamento: [''],
  });

  protected isEnfermedadSelected(value: EnfermedadEnum): boolean {
    return this.selectedEnfermedades().includes(value);
  }

  protected isSintomaSelected(value: SintomaEnum): boolean {
    return this.selectedSintomas().includes(value);
  }

  protected toggleEnfermedad(value: EnfermedadEnum): void {
    this.selectedEnfermedades.update(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  protected toggleSintoma(value: SintomaEnum): void {
    this.selectedSintomas.update(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  protected onEstadoChange(value: EstadoMedicamento): void {
    this.estadoMedicamento.set(value);
  }

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.currentSize.set(event.size);
  }

  protected onSubmit(): void {
    const raw = this.form.getRawValue();

    if (this.showOtraEnfermedad() && !raw.otraEnfermedad.trim()) {
      this.notificationService.error('Debe describir la enfermedad cuando selecciona OTRA.');
      return;
    }
    if (this.showOtroSintoma() && !raw.otroSintoma.trim()) {
      this.notificationService.error('Debe describir el síntoma cuando selecciona OTRO.');
      return;
    }
    if (this.showDescripcionMedicamento() && !raw.descripcionMedicamento.trim()) {
      this.notificationService.error('Debe proporcionar el nombre y dosis del medicamento o suplemento.');
      return;
    }

    this.isSubmitting.set(true);

    const request: HistorialMedicoRequest = {
      enfermedades: this.selectedEnfermedades(),
      otraEnfermedad: this.showOtraEnfermedad() ? raw.otraEnfermedad : undefined,
      alergias: raw.alergias.trim() || undefined,
      sintomas: this.selectedSintomas(),
      otroSintoma: this.showOtroSintoma() ? raw.otroSintoma : undefined,
      estadoMedicamento: this.estadoMedicamento(),
      descripcionMedicamento: this.showDescripcionMedicamento() ? raw.descripcionMedicamento : undefined,
    };

    const op$ = this.modoEdicion()
      ? this.historialService.actualizar(this.editingId()!, request)
      : this.historialService.registrar(this.pacienteId(), request);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const msg = this.modoEdicion()
          ? 'Historial médico actualizado correctamente'
          : 'Historial médico registrado correctamente';
        this.notificationService.success(msg);
        this.historialResource.reload();
        this.resetForm();
        this.isSubmitting.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  protected editarHistorial(historial: HistorialMedicoItem): void {
    this.editingId.set(historial.id);
    this.editingFecha.set(historial.fechaRegistro);
    this.selectedEnfermedades.set([...(historial.enfermedades ?? [])]);
    setTimeout(() => {
      document.getElementById('historial-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
    this.selectedSintomas.set([...(historial.sintomas ?? [])]);
    this.estadoMedicamento.set(historial.estadoMedicamento);
    this.form.patchValue({
      otraEnfermedad: historial.otraEnfermedad ?? '',
      alergias: historial.alergias ?? '',
      otroSintoma: historial.otroSintoma ?? '',
      descripcionMedicamento: historial.descripcionMedicamento ?? '',
    });
  }

  protected async eliminarHistorial(historialId: number): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar historial médico',
      '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;

    this.historialService
      .eliminar(historialId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Historial médico eliminado correctamente');
          this.historialResource.reload();
          if (this.editingId() === historialId) this.resetForm();
        },
      });
  }

  protected cancelarEdicion(): void {
    this.resetForm();
  }

  protected getEnfermedadLabel(value: EnfermedadEnum): string {
    return ENFERMEDAD_LABEL[value] ?? value;
  }

  protected getSintomaLabel(value: SintomaEnum): string {
    return SINTOMA_LABEL[value] ?? value;
  }

  protected getEstadoBadgeClass(value: EstadoMedicamento): string {
    const map: Record<EstadoMedicamento, string> = {
      NUNCA: 'badge-neutral',
      ACTUALMENTE: 'badge-warning',
      ANTERIORMENTE: 'badge-info',
    };
    return map[value];
  }

  protected getEstadoLabel(value: EstadoMedicamento): string {
    const map: Record<EstadoMedicamento, string> = {
      NUNCA: 'Nunca',
      ACTUALMENTE: 'Actualmente',
      ANTERIORMENTE: 'Anteriormente',
    };
    return map[value];
  }

  protected formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private resetForm(): void {
    this.editingId.set(null);
    this.editingFecha.set('');
    this.selectedEnfermedades.set([]);
    this.selectedSintomas.set([]);
    this.estadoMedicamento.set('NUNCA');
    this.form.reset({ otraEnfermedad: '', alergias: '', otroSintoma: '', descripcionMedicamento: '' });
  }
}
