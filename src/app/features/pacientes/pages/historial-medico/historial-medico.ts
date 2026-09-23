import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HistorialMedicoService } from '../../service/historial-medico-service';
import { MedidaAntropometricaService } from '../../service/medida-antropometrica-service';
import { PacienteService } from '../../service/paciente-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { FormValidatorHelper } from '../../../../shared/helpers/form-validator-helper';
import {
  EnfermedadEnum,
  EstadoMedicamento,
  HistorialMedicoItem,
  HistorialMedicoRequest,
  SintomaEnum,
} from '../../interfaces/historial-medico.interface';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

export interface EnfermedadOption {
  value: EnfermedadEnum;
  label: string;
  category: 'METABOLICAS' | 'CARDIOVASCULARES' | 'RESPIRATORIAS' | 'DIGESTIVAS' | 'OTRAS';
}

export interface SintomaOption {
  value: SintomaEnum;
  label: string;
  category: 'GENERALES' | 'DIGESTIVOS' | 'RESPIRATORIOS' | 'NEUROLOGICOS' | 'MUSCULARES' | 'OTROS';
}

const ENFERMEDADES_OPTIONS: EnfermedadOption[] = [
  { value: 'DIABETES_TIPO_1', label: 'Diabetes Tipo 1', category: 'METABOLICAS' },
  { value: 'DIABETES_TIPO_2', label: 'Diabetes Tipo 2', category: 'METABOLICAS' },
  { value: 'HIPOTIROIDISMO', label: 'Hipotiroidismo', category: 'METABOLICAS' },
  { value: 'HIPERTIROIDISMO', label: 'Hipertiroidismo', category: 'METABOLICAS' },
  { value: 'SINDROME_METABOLICO', label: 'Síndrome Metabólico', category: 'METABOLICAS' },
  { value: 'OBESIDAD', label: 'Obesidad', category: 'METABOLICAS' },
  { value: 'COLESTEROL_ALTO', label: 'Colesterol Alto', category: 'METABOLICAS' },
  { value: 'TRIGLICERIDOS_ALTOS', label: 'Triglicéridos Altos', category: 'METABOLICAS' },
  { value: 'GOTA', label: 'Gota', category: 'METABOLICAS' },

  { value: 'HIPERTENSION', label: 'Hipertensión Arterial', category: 'CARDIOVASCULARES' },
  { value: 'ENFERMEDAD_CARDIACA', label: 'Enfermedad Cardíaca', category: 'CARDIOVASCULARES' },
  { value: 'INSUFICIENCIA_CARDIACA', label: 'Insuficiencia Cardíaca', category: 'CARDIOVASCULARES' },

  { value: 'ASMA', label: 'Asma', category: 'RESPIRATORIAS' },
  { value: 'EPOC', label: 'EPOC', category: 'RESPIRATORIAS' },
  { value: 'RINITIS_ALERGICA', label: 'Rinitis Alérgica', category: 'RESPIRATORIAS' },

  { value: 'ENFERMEDAD_HEPATICA', label: 'Enfermedad Hepática', category: 'DIGESTIVAS' },
  { value: 'HIGADO_GRASO', label: 'Hígado Graso', category: 'DIGESTIVAS' },
  { value: 'ENFERMEDAD_RENAL', label: 'Enfermedad Renal', category: 'DIGESTIVAS' },
  { value: 'COLITIS', label: 'Colitis', category: 'DIGESTIVAS' },
  { value: 'GASTRITIS', label: 'Gastritis', category: 'DIGESTIVAS' },
  { value: 'SINDROME_INTESTINO_IRRITABLE', label: 'Síndrome Intestino Irritable', category: 'DIGESTIVAS' },

  { value: 'ARTRITIS', label: 'Artritis', category: 'OTRAS' },
  { value: 'OSTEOPOROSIS', label: 'Osteoporosis', category: 'OTRAS' },
  { value: 'CANCER', label: 'Cáncer', category: 'OTRAS' },
  { value: 'VIH_SIDA', label: 'VIH / SIDA', category: 'OTRAS' },
  { value: 'NINGUNA', label: 'Ninguna Enfermedad', category: 'OTRAS' },
  { value: 'OTRA', label: 'Otra Enfermedad', category: 'OTRAS' },
];

const SINTOMAS_OPTIONS: SintomaOption[] = [
  { value: 'FIEBRE', label: 'Fiebre', category: 'GENERALES' },
  { value: 'CANSANCIO_FATIGA', label: 'Cansancio / Fatiga', category: 'GENERALES' },
  { value: 'PERDIDA_DE_PESO', label: 'Pérdida de Peso Involuntaria', category: 'GENERALES' },
  { value: 'AUMENTO_DE_PESO', label: 'Aumento de Peso Inexplicable', category: 'GENERALES' },
  { value: 'SUDORACION_EXCESIVA', label: 'Sudoración Excesiva', category: 'GENERALES' },
  { value: 'DEBILIDAD_GENERAL', label: 'Debilidad General', category: 'GENERALES' },
  { value: 'SED_EXCESIVA', label: 'Sed Excesiva', category: 'GENERALES' },
  { value: 'ORINA_FRECUENTE', label: 'Orina Frecuente', category: 'GENERALES' },

  { value: 'NAUSEAS', label: 'Náuseas', category: 'DIGESTIVOS' },
  { value: 'VOMITO', label: 'Vómito', category: 'DIGESTIVOS' },
  { value: 'DIARREA', label: 'Diarrea', category: 'DIGESTIVOS' },
  { value: 'ESTRENIMIENTO', label: 'Estreñimiento', category: 'DIGESTIVOS' },
  { value: 'DOLOR_ABDOMINAL', label: 'Dolor Abdominal', category: 'DIGESTIVOS' },
  { value: 'DISTENSION_ABDOMINAL', label: 'Distensión / Hinchazón', category: 'DIGESTIVOS' },
  { value: 'REFLUJO', label: 'Reflujo / Acidez', category: 'DIGESTIVOS' },
  { value: 'PERDIDA_DE_APETITO', label: 'Pérdida de Apetito', category: 'DIGESTIVOS' },
  { value: 'AUMENTO_DE_APETITO', label: 'Aumento de Apetito', category: 'DIGESTIVOS' },

  { value: 'DIFICULTAD_PARA_RESPIRAR', label: 'Dificultad para Respirar', category: 'RESPIRATORIOS' },
  { value: 'DOLOR_EN_EL_PECHO', label: 'Dolor en el Pecho', category: 'RESPIRATORIOS' },
  { value: 'PALPITACIONES', label: 'Palpitaciones', category: 'RESPIRATORIOS' },
  { value: 'TOS', label: 'Tos Persistente', category: 'RESPIRATORIOS' },
  { value: 'CONGESTION_NASAL', label: 'Congestión Nasal', category: 'RESPIRATORIOS' },

  { value: 'DOLOR_DE_CABEZA', label: 'Dolor de Cabeza / Cefalea', category: 'NEUROLOGICOS' },
  { value: 'MAREO', label: 'Mareos o Vértigo', category: 'NEUROLOGICOS' },
  { value: 'INSOMNIO', label: 'Insomnio o Trastornos del Sueño', category: 'NEUROLOGICOS' },
  { value: 'ANSIEDAD', label: 'Ansiedad', category: 'NEUROLOGICOS' },
  { value: 'DEPRESION', label: 'Depresión / Desánimo', category: 'NEUROLOGICOS' },

  { value: 'DOLOR_MUSCULAR', label: 'Dolor Muscular (Mialgia)', category: 'MUSCULARES' },
  { value: 'DOLOR_ARTICULAR', label: 'Dolor Articular', category: 'MUSCULARES' },
  { value: 'CALAMBRES', label: 'Calambres Musculares', category: 'MUSCULARES' },
  { value: 'INFLAMACION', label: 'Inflamación / Edema', category: 'MUSCULARES' },
  { value: 'CAMBIOS_EN_LA_PIEL', label: 'Cambios en la Piel / Erupciones', category: 'MUSCULARES' },
  { value: 'CAIDA_DE_CABELLO', label: 'Caída de Cabello', category: 'MUSCULARES' },

  { value: 'NINGUNO', label: 'Ningún Síntoma', category: 'OTROS' },
  { value: 'OTRO', label: 'Otro Síntoma', category: 'OTROS' },
];

const ENFERMEDAD_LABEL: Record<EnfermedadEnum, string> = Object.fromEntries(
  ENFERMEDADES_OPTIONS.map((o) => [o.value, o.label])
) as Record<EnfermedadEnum, string>;

const SINTOMA_LABEL: Record<SintomaEnum, string> = Object.fromEntries(
  SINTOMAS_OPTIONS.map((o) => [o.value, o.label])
) as Record<SintomaEnum, string>;

const ALERGIAS_SUGERIDAS = [
  'Penicilina',
  'AINEs (Ibuprofeno / Aspirina)',
  'Mariscos',
  'Frutos secos / Cacahuates',
  'Lactosa / Lácteos',
  'Gluten / Trigo',
  'Huevo',
  'Polen / Ácaros',
  'Látex',
  'Fresas',
];

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
  protected readonly alergiasSugeridas = ALERGIAS_SUGERIDAS;

  protected readonly estadoMedicamentoOptions: {
    value: EstadoMedicamento;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      value: 'NUNCA',
      label: 'Sin consumo',
      description: 'Nunca ha tomado medicamentos o suplementos',
      icon: 'shield-check',
    },
    {
      value: 'ACTUALMENTE',
      label: 'Actualmente consume',
      description: 'Toma medicamentos o suplementos en la actualidad',
      icon: 'pill',
    },
    {
      value: 'ANTERIORMENTE',
      label: 'Consumo anterior',
      description: 'Tomó medicamentos o suplementos en el pasado',
      icon: 'history',
    },
  ];

  protected isSubmitting = signal(false);
  protected submitted = signal(false);
  protected editingId = signal<number | null>(null);
  protected editingFecha = signal<string>('');
  protected modoEdicion = computed(() => this.editingId() !== null);

  protected selectedEnfermedades = signal<EnfermedadEnum[]>([]);
  protected selectedSintomas = signal<SintomaEnum[]>([]);
  protected estadoMedicamento = signal<EstadoMedicamento>('NUNCA');

  // Search & Categories filters
  protected enfermedadSearch = signal('');
  protected enfermedadCategory = signal<string>('TODAS');
  protected sintomaSearch = signal('');
  protected sintomaCategory = signal<string>('TODOS');

  // Historial search & filter
  protected historialSearch = signal('');
  protected historialEstadoFilter = signal<string>('TODOS');

  protected showOtraEnfermedad = computed(() =>
    this.selectedEnfermedades().includes('OTRA')
  );
  protected showOtroSintoma = computed(() =>
    this.selectedSintomas().includes('OTRO')
  );
  protected showDescripcionMedicamento = computed(
    () => this.estadoMedicamento() !== 'NUNCA'
  );

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
    return [p.nombre, p.apellidoPaterno, p.apellidoMaterno]
      .filter(Boolean)
      .join(' ');
  });

  protected inicialesPaciente = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return 'HM';
    const n = p.nombre?.charAt(0) ?? '';
    const a = p.apellidoPaterno?.charAt(0) ?? '';
    return (n + a).toUpperCase() || 'HM';
  });

  // Filtered diseases
  protected filteredEnfermedades = computed(() => {
    const query = this.enfermedadSearch().toLowerCase().trim();
    const cat = this.enfermedadCategory();

    return this.enfermedadesOptions.filter((opt) => {
      const matchCat = cat === 'TODAS' || opt.category === cat;
      const matchQuery =
        !query ||
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  });

  // Filtered symptoms
  protected filteredSintomas = computed(() => {
    const query = this.sintomaSearch().toLowerCase().trim();
    const cat = this.sintomaCategory();

    return this.sintomasOptions.filter((opt) => {
      const matchCat = cat === 'TODOS' || opt.category === cat;
      const matchQuery =
        !query ||
        opt.label.toLowerCase().includes(query) ||
        opt.value.toLowerCase().includes(query);
      return matchCat && matchQuery;
    });
  });

  // Computed IMC from latest antropometric measurement
  protected imcData = computed(() => {
    const medida = this.ultimaMedidaResource.value();
    if (!medida || !medida.peso || !medida.altura) return null;
    const alturaM = medida.altura / 100;
    const imc = Number((medida.peso / (alturaM * alturaM)).toFixed(1));

    let estado = 'Normal';
    let clase = 'imc--normal';

    if (imc < 18.5) {
      estado = 'Bajo peso';
      clase = 'imc--warning';
    } else if (imc >= 18.5 && imc < 25) {
      estado = 'Peso Normal';
      clase = 'imc--success';
    } else if (imc >= 25 && imc < 30) {
      estado = 'Sobrepeso';
      clase = 'imc--warning';
    } else {
      estado = 'Obesidad';
      clase = 'imc--danger';
    }

    return { imc, estado, clase };
  });

  // Filtered records in history section
  protected filteredHistorialRecords = computed(() => {
    const pagina = this.historialResource.value();
    if (!pagina || !pagina.content) return [];

    const query = this.historialSearch().toLowerCase().trim();
    const estado = this.historialEstadoFilter();

    return pagina.content.filter((item) => {
      const matchEstado = estado === 'TODOS' || item.estadoMedicamento === estado;
      if (!matchEstado) return false;

      if (!query) return true;

      const enfLabels = (item.enfermedades ?? [])
        .map((e) => this.getEnfermedadLabel(e).toLowerCase())
        .join(' ');
      const sinLabels = (item.sintomas ?? [])
        .map((s) => this.getSintomaLabel(s).toLowerCase())
        .join(' ');
      const otraEnf = (item.otraEnfermedad ?? '').toLowerCase();
      const otroSin = (item.otroSintoma ?? '').toLowerCase();
      const alergias = (item.alergias ?? '').toLowerCase();
      const med = (item.descripcionMedicamento ?? '').toLowerCase();
      const fecha = (item.fechaRegistro ?? '').toLowerCase();

      return (
        enfLabels.includes(query) ||
        sinLabels.includes(query) ||
        otraEnf.includes(query) ||
        otroSin.includes(query) ||
        alergias.includes(query) ||
        med.includes(query) ||
        fecha.includes(query)
      );
    });
  });

  protected form = this.fb.nonNullable.group({
    otraEnfermedad: ['', [Validators.maxLength(500)]],
    alergias: ['', [Validators.maxLength(500)]],
    otroSintoma: ['', [Validators.maxLength(500)]],
    descripcionMedicamento: ['', [Validators.maxLength(500)]],
  });

  // Step validation helpers
  protected get isPaso1Valido(): boolean {
    if (this.selectedEnfermedades().length === 0) return false;
    if (this.showOtraEnfermedad()) {
      const val = this.form.get('otraEnfermedad')?.value?.trim() ?? '';
      if (val.length < 3) return false;
    }
    return true;
  }

  protected get isPaso2Valido(): boolean {
    if (this.selectedSintomas().length === 0) return false;
    if (this.showOtroSintoma()) {
      const val = this.form.get('otroSintoma')?.value?.trim() ?? '';
      if (val.length < 3) return false;
    }
    return true;
  }

  protected get isPaso3Valido(): boolean {
    if (this.showDescripcionMedicamento()) {
      const val = this.form.get('descripcionMedicamento')?.value?.trim() ?? '';
      if (val.length < 3) return false;
    }
    return true;
  }

  protected isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    if (!control) return false;
    return (
      (control.invalid && (control.touched || control.dirty || this.submitted())) ||
      false
    );
  }

  protected isEnfermedadSelected(value: EnfermedadEnum): boolean {
    return this.selectedEnfermedades().includes(value);
  }

  protected isSintomaSelected(value: SintomaEnum): boolean {
    return this.selectedSintomas().includes(value);
  }

  protected toggleEnfermedad(value: EnfermedadEnum): void {
    if (value === 'NINGUNA') {
      // Si selecciona NINGUNA, desmarca todas las demás
      if (this.selectedEnfermedades().includes('NINGUNA')) {
        this.selectedEnfermedades.set([]);
      } else {
        this.selectedEnfermedades.set(['NINGUNA']);
        this.form.patchValue({ otraEnfermedad: '' });
      }
      return;
    }

    this.selectedEnfermedades.update((prev) => {
      // Si se selecciona cualquier otra enfermedad, se quita NINGUNA
      const sinNinguna = prev.filter((v) => v !== 'NINGUNA');
      if (sinNinguna.includes(value)) {
        const filtrado = sinNinguna.filter((v) => v !== value);
        if (value === 'OTRA') this.form.patchValue({ otraEnfermedad: '' });
        return filtrado;
      } else {
        return [...sinNinguna, value];
      }
    });
  }

  protected toggleSintoma(value: SintomaEnum): void {
    if (value === 'NINGUNO') {
      // Si selecciona NINGUNO, desmarca todos los demás
      if (this.selectedSintomas().includes('NINGUNO')) {
        this.selectedSintomas.set([]);
      } else {
        this.selectedSintomas.set(['NINGUNO']);
        this.form.patchValue({ otroSintoma: '' });
      }
      return;
    }

    this.selectedSintomas.update((prev) => {
      // Si se selecciona cualquier otro síntoma, se quita NINGUNO
      const sinNinguno = prev.filter((v) => v !== 'NINGUNO');
      if (sinNinguno.includes(value)) {
        const filtrado = sinNinguno.filter((v) => v !== value);
        if (value === 'OTRO') this.form.patchValue({ otroSintoma: '' });
        return filtrado;
      } else {
        return [...sinNinguno, value];
      }
    });
  }

  protected seleccionarNingunaEnfermedad(): void {
    this.selectedEnfermedades.set(['NINGUNA']);
    this.form.patchValue({ otraEnfermedad: '' });
  }

  protected limpiarEnfermedades(): void {
    this.selectedEnfermedades.set([]);
    this.form.patchValue({ otraEnfermedad: '' });
  }

  protected seleccionarNingunSintoma(): void {
    this.selectedSintomas.set(['NINGUNO']);
    this.form.patchValue({ otroSintoma: '' });
  }

  protected limpiarSintomas(): void {
    this.selectedSintomas.set([]);
    this.form.patchValue({ otroSintoma: '' });
  }

  protected agregarAlergiaSugerida(alergia: string): void {
    const actual = this.form.get('alergias')?.value?.trim() || '';
    if (!actual) {
      this.form.patchValue({ alergias: alergia });
    } else {
      const items = actual.split(',').map((s) => s.trim().toLowerCase());
      if (!items.includes(alergia.toLowerCase())) {
        this.form.patchValue({ alergias: `${actual}, ${alergia}` });
      }
    }
  }

  protected onEstadoChange(value: EstadoMedicamento): void {
    this.estadoMedicamento.set(value);
    if (value === 'NUNCA') {
      this.form.patchValue({ descripcionMedicamento: '' });
    }
  }

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.currentSize.set(event.size);
  }

  protected onSubmit(): void {
    this.submitted.set(true);
    const raw = this.form.getRawValue();

    // 1. Validar que no se vaya en blanco enfermedades
    if (this.selectedEnfermedades().length === 0) {
      this.notificationService.error(
        'Paso 1 incompleto: Debe seleccionar al menos una enfermedad o marcar "Ninguna".'
      );
      this.scrollToElement('paso-enfermedades');
      return;
    }

    if (this.showOtraEnfermedad() && (!raw.otraEnfermedad.trim() || raw.otraEnfermedad.trim().length < 3)) {
      this.notificationService.error(
        'Paso 1 incompleto: Por favor especifique la enfermedad (mínimo 3 caracteres).'
      );
      this.scrollToElement('otraEnfermedad');
      return;
    }

    // 2. Validar que no se vaya en blanco síntomas
    if (this.selectedSintomas().length === 0) {
      this.notificationService.error(
        'Paso 2 incompleto: Debe seleccionar al menos un síntoma presente o marcar "Ninguno".'
      );
      this.scrollToElement('paso-sintomas');
      return;
    }

    if (this.showOtroSintoma() && (!raw.otroSintoma.trim() || raw.otroSintoma.trim().length < 3)) {
      this.notificationService.error(
        'Paso 2 incompleto: Por favor especifique el síntoma (mínimo 3 caracteres).'
      );
      this.scrollToElement('otroSintoma');
      return;
    }

    // 3. Validar descripción de medicamento si aplica
    if (this.showDescripcionMedicamento() && (!raw.descripcionMedicamento.trim() || raw.descripcionMedicamento.trim().length < 3)) {
      this.notificationService.error(
        'Paso 3 incompleto: Proporcione el nombre, dosis o frecuencia del medicamento o suplemento.'
      );
      this.scrollToElement('descripcionMedicamento');
      return;
    }

    if (this.form.invalid) {
      this.notificationService.error(
        'Revise los campos del formulario antes de continuar.'
      );
      return;
    }

    this.isSubmitting.set(true);

    const request: HistorialMedicoRequest = {
      enfermedades: this.selectedEnfermedades(),
      otraEnfermedad: this.showOtraEnfermedad() ? raw.otraEnfermedad.trim() : undefined,
      alergias: raw.alergias.trim() || undefined,
      sintomas: this.selectedSintomas(),
      otroSintoma: this.showOtroSintoma() ? raw.otroSintoma.trim() : undefined,
      estadoMedicamento: this.estadoMedicamento(),
      descripcionMedicamento: this.showDescripcionMedicamento()
        ? raw.descripcionMedicamento.trim()
        : undefined,
    };

    const op$ = this.modoEdicion()
      ? this.historialService.actualizar(this.editingId()!, request)
      : this.historialService.registrar(this.pacienteId(), request);

    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        const msg = this.modoEdicion()
          ? 'Historial médico actualizado exitosamente'
          : 'Historial médico registrado exitosamente';
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
    this.selectedSintomas.set([...(historial.sintomas ?? [])]);
    this.estadoMedicamento.set(historial.estadoMedicamento);
    this.form.patchValue({
      otraEnfermedad: historial.otraEnfermedad ?? '',
      alergias: historial.alergias ?? '',
      otroSintoma: historial.otroSintoma ?? '',
      descripcionMedicamento: historial.descripcionMedicamento ?? '',
    });
    this.submitted.set(false);

    setTimeout(() => {
      document.getElementById('historial-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 50);
  }

  protected async eliminarHistorial(historialId: number): Promise<void> {
    const confirmed = await this.confirmDialog.open(
      'Eliminar historial médico',
      '¿Estás seguro de que deseas eliminar este registro médico? Esta acción no se puede deshacer.'
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
      NUNCA: 'badge-med--nunca',
      ACTUALMENTE: 'badge-med--actualmente',
      ANTERIORMENTE: 'badge-med--anteriormente',
    };
    return map[value] || 'badge-med--nunca';
  }

  protected getEstadoLabel(value: EstadoMedicamento): string {
    const map: Record<EstadoMedicamento, string> = {
      NUNCA: 'Sin Medicamentos',
      ACTUALMENTE: 'Actualmente en Tratamiento',
      ANTERIORMENTE: 'Tratamiento Pasado',
    };
    return map[value] || value;
  }

  protected formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 30) return `Hace ${diffDays} días`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return 'Hace 1 mes';
    if (diffMonths < 12) return `Hace ${diffMonths} meses`;
    return `Hace más de 1 año`;
  }

  protected scrollToElement(id: string): void {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if ('focus' in el) {
          (el as HTMLElement).focus();
        }
      }
    }, 50);
  }

  protected resetForm(): void {
    this.editingId.set(null);
    this.editingFecha.set('');
    this.selectedEnfermedades.set([]);
    this.selectedSintomas.set([]);
    this.estadoMedicamento.set('NUNCA');
    this.submitted.set(false);
    this.form.reset({
      otraEnfermedad: '',
      alergias: '',
      otroSintoma: '',
      descripcionMedicamento: '',
    });
  }
}
