import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { PacienteService } from '../../../pacientes/service/paciente-service';
import { PlanAlimenticioService } from '../../service/plan-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { Paciente } from '../../../pacientes/interfaces/paciente.interface';
import { PlanAlimenticioResponse } from '../../interfaces/plan.interface';
import { PageEvent } from '../../../../shared/interfaces/page.interface';

@Component({
  selector: 'app-lista-planes',
  imports: [ReactiveFormsModule, Pagination],
  templateUrl: './lista-planes.html',
  styleUrl: './lista-planes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaPlanes {
  private readonly pacienteService = inject(PacienteService);
  private readonly planService = inject(PlanAlimenticioService);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  protected currentPage = signal(0);
  protected pageSize = signal(6);

  protected pacientesResource = rxResource({
    params: () => ({ page: this.currentPage(), size: this.pageSize() }),
    stream: ({ params }) => this.pacienteService.obtenerPacientes(params.page, params.size),
  });

  protected planesPorPaciente = signal<Map<number, PlanAlimenticioResponse[]>>(new Map());
  protected pacientesCargando = signal<Set<number>>(new Set());
  protected isDeletingPlan = signal<number | null>(null);

  protected modalAbierto = signal(false);
  protected pacienteModal = signal<Paciente | null>(null);

  protected form = this.fb.group({
    nombre: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    duracionDias: [15, [Validators.required, Validators.min(1), Validators.max(90)]],
  });

  constructor() {
    effect(() => {
      const patients = this.pacientesResource.value()?.content;
      if (!patients) return;

      untracked(() => {
        const yaCargados = this.planesPorPaciente();
        const cargando = this.pacientesCargando();

        patients.forEach(patient => {
          if (!patient.id) return;
          const id = patient.id;
          if (yaCargados.has(id) || cargando.has(id)) return;

          this.pacientesCargando.update(s => new Set([...s, id]));

          this.planService
            .obtenerPlanesDePaciente(id)
            .pipe(
              map(r => r.datos ?? []),
              catchError(() => of([])),
              takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(planes => {
              this.planesPorPaciente.update(m => new Map([...m, [id, planes]]));
              this.pacientesCargando.update(s => {
                const next = new Set(s);
                next.delete(id);
                return next;
              });
            });
        });
      });
    });
  }

  protected onPageChange(event: PageEvent): void {
    this.currentPage.set(event.page);
    this.pageSize.set(event.size);
    this.planesPorPaciente.set(new Map());
    this.pacientesCargando.set(new Set());
  }

  protected getPatientPlans(pacienteId: number): PlanAlimenticioResponse[] {
    return this.planesPorPaciente().get(pacienteId) ?? [];
  }

  protected isPatientLoading(pacienteId: number): boolean {
    return this.pacientesCargando().has(pacienteId);
  }

  protected abrirModal(paciente: Paciente): void {
    if (!paciente.id) return;
    this.pacienteModal.set(paciente);
    const hoy = new Date().toISOString().split('T')[0];
    this.form.reset({
      nombre: `Plan - ${paciente.nombre}`,
      fechaInicio: hoy,
      duracionDias: 15,
    });
    this.modalAbierto.set(true);
  }

  protected cerrarModal(): void {
    this.modalAbierto.set(false);
    this.pacienteModal.set(null);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const paciente = this.pacienteModal();
    if (!paciente?.id) return;

    const v = this.form.getRawValue();
    this.cerrarModal();

    this.router.navigate(['/main/planes/nuevo'], {
      state: {
        pacienteId: paciente.id,
        pacienteNombre: `${paciente.nombre} ${paciente.apellidoPaterno}`,
        nombre: v.nombre,
        fechaInicio: v.fechaInicio,
        duracionDias: v.duracionDias,
      },
    });
  }

  protected irAEditorPlan(planId: number): void {
    this.router.navigate(['/main/planes', planId]);
  }

  protected async eliminarPlan(
    plan: PlanAlimenticioResponse,
    pacienteId: number,
    event: Event,
  ): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.confirmDialog.open(
      'Eliminar plan',
      `¿Estás seguro de eliminar el plan "${plan.nombre}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    this.isDeletingPlan.set(plan.id);
    this.planService
      .eliminarPlan(plan.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success('Plan eliminado correctamente');
          this.planesPorPaciente.update(m => {
            const next = new Map(m);
            next.set(
              pacienteId,
              (next.get(pacienteId) ?? []).filter(p => p.id !== plan.id),
            );
            return next;
          });
          this.isDeletingPlan.set(null);
        },
        error: () => this.isDeletingPlan.set(null),
      });
  }

  protected obtenerIniciales(paciente: Paciente): string {
    return `${paciente.nombre.charAt(0)}${paciente.apellidoPaterno.charAt(0)}`.toUpperCase();
  }

  protected obtenerColorAvatar(id: number): { bg: string; text: string } {
    const colores = [
      { bg: '#E3F2FD', text: '#1565C0' },
      { bg: '#E8F5E9', text: '#2E7D32' },
      { bg: '#EDE7F6', text: '#673AB7' },
      { bg: '#FFF3E0', text: '#E65100' },
      { bg: '#FCE4EC', text: '#C2185B' },
    ];
    return colores[id % colores.length];
  }

  protected formatearFecha(fecha: string): string {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  protected getNombreCompleto(paciente: Paciente): string {
    return `${paciente.nombre} ${paciente.apellidoPaterno}${paciente.apellidoMaterno ? ' ' + paciente.apellidoMaterno : ''}`;
  }
}
