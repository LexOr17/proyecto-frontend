import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { NotificacionBackendService } from '../../../core/services/notificacion-backend.service';
import { NotificacionBackend } from '../../../core/interfaces/notificacion-backend.interface';

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell {
  private readonly elRef = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly svc = inject(NotificacionBackendService);

  protected readonly isOpen = signal(false);

  constructor() {
    /**
     * Se suscribe al Subject del servicio que emite cada vez que el conteo
     * de notificaciones no leídas cambia (ya sea por WebSocket o por polling).
     *
     * Se usa detectChanges() en lugar de markForCheck() porque:
     * - detectChanges() es síncrono: ejecuta el ciclo de CD inmediatamente
     *   para este componente y su subárbol, sin esperar al próximo tick.
     * - markForCheck() solo marca el componente como "sucio" y espera al
     *   siguiente ciclo del scheduler, que puede no dispararse en componentes
     *   dentro de vistas embebidas (lazy-loaded routes).
     */
    this.svc.conteoActualizado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.detectChanges());
  }

  /** Cierra el panel cuando se hace click fuera del componente */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  protected togglePanel(): void {
    const opening = !this.isOpen();
    this.isOpen.set(opening);
    if (opening) {
      this.svc.cargarNotificaciones();
      this.svc.cargarConteoNoLeidas();
    }
  }

  protected onClickNotificacion(notificacion: NotificacionBackend): void {
    this.svc.abrirNotificacion(notificacion);
    this.isOpen.set(false);
  }

  protected marcarTodasComoLeidas(event: MouseEvent): void {
    event.stopPropagation();
    this.svc.marcarTodasComoLeidas();
  }

  protected getIcono(tipo: NotificacionBackend['tipo']): string {
    switch (tipo) {
      case 'PLAN_ASIGNADO':       return '📋';
      case 'PACIENTE_ASIGNADO':   return '👤';
      case 'NUEVO_ALIMENTO':      return '🥦';
      case 'NUEVA_PLANTILLA':     return '📄';
      case 'CITA_SOLICITADA':     return '📅';
      case 'CITA_ACTUALIZADA':    return '🗓️';
      case 'NUEVO_MENSAJE_CHAT':  return '💬';
      case 'NUEVA_SUGERENCIA':    return '💡';
      case 'SUGERENCIA_REVISADA': return '📝';
      default:                    return '🔔';
    }
  }
}
