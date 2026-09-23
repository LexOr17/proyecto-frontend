import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BackupService } from '../../service/backup-service';
import { NotificationService } from '../../../../shared/service/notification-service';
import { ConfirmDialogService } from '../../../../shared/service/confirm-dialog-service';

@Component({
  selector: 'app-backup-page',
  templateUrl: './backup-page.html',
  styleUrl: './backup-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackupPage {
  private readonly backupService = inject(BackupService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  protected isDownloading = signal(false);
  protected isRestoring = signal(false);
  protected selectedFile = signal<File | null>(null);

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.name.endsWith('.sql') && !file.name.endsWith('.sql.gz')) {
      this.notificationService.error('Solo se permiten archivos .sql o .sql.gz');
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
  }

  protected removeFile(): void {
    this.selectedFile.set(null);
  }

  protected descargarBackup(): void {
    this.isDownloading.set(true);

    this.backupService
      .descargarBackup()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const timestamp = new Date().toISOString().slice(0, 10);
          const filename = `backup_${timestamp}.sql`;

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          window.URL.revokeObjectURL(url);

          this.notificationService.success('Respaldo descargado correctamente');
          this.isDownloading.set(false);
        },
        error: () => {
          this.notificationService.error('Error al descargar el respaldo');
          this.isDownloading.set(false);
        },
      });
  }

  protected async restaurarBackup(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    const confirmed = await this.confirmDialog.open(
      'Restaurar Base de Datos',
      `¿Estás seguro de restaurar la base de datos con el archivo "${file.name}"? Esta acción reemplazará todos los datos actuales y no se puede deshacer.`
    );

    if (!confirmed) return;

    this.isRestoring.set(true);

    this.backupService
      .restaurarBackup(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Base de datos restaurada correctamente'
          );
          this.isRestoring.set(false);
          this.selectedFile.set(null);
        },
        error: () => {
          this.notificationService.error('Error al restaurar la base de datos');
          this.isRestoring.set(false);
        },
      });
  }
}
