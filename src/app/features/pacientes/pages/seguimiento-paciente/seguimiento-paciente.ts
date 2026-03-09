import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PacienteService } from '../../service/paciente-service';

@Component({
  selector: 'app-seguimiento-paciente',
  imports: [RouterLink],
  templateUrl: './seguimiento-paciente.html',
  styleUrl: './seguimiento-paciente.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeguimientoPaciente {

  private readonly route = inject(ActivatedRoute);
  private readonly pacienteService = inject(PacienteService);

  private readonly pacienteId = signal<number>(
    Number(this.route.snapshot.paramMap.get('id'))
  );

  protected pacienteResource = rxResource({
    params: () => ({ id: this.pacienteId() }),
    stream: ({ params }) => this.pacienteService.obtenerPacientePorId(params.id),
  });

  protected iniciales = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return '';
    return p.nombre.charAt(0).toUpperCase() + p.apellidoPaterno.charAt(0).toUpperCase();
  });

  protected nombreCompleto = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return '';
    return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
  });

  protected edad = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return 0;
    const hoy = new Date();
    const nacimiento = new Date(p.fechaNacimiento + 'T00:00:00');
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  });

  protected fechaNacimientoFormateada = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return '';
    const fecha = new Date(p.fechaNacimiento + 'T00:00:00');
    return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  });

  protected generoFormateado = computed(() => {
    const p = this.pacienteResource.value();
    if (!p) return '';
    const generos: Record<string, string> = {
      MASCULINO: 'Masculino',
      FEMENINO: 'Femenino',
      OTRO: 'Otro',
    };
    return generos[p.genero] ?? p.genero;
  });
}
