import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DialogFrameComponent } from '../../../../shared/ui/dialog-frame/dialog-frame.component';

export interface DoctorModeAppointmentsData {
  count: number;
}

export interface DoctorModeAppointmentsResult {
  reason: string;
}

const REASON_MAX_LENGTH = 500;

@Component({
  selector: 'app-doctor-mode-appointments-dialog',
  imports: [DialogFrameComponent],
  templateUrl: './doctor-mode-appointments-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorModeAppointmentsDialogComponent {
  protected readonly data = inject<DoctorModeAppointmentsData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<DoctorModeAppointmentsResult>>(DialogRef);

  protected readonly maxLength = REASON_MAX_LENGTH;
  protected readonly reason = signal('');
  protected readonly message = computed(() =>
    this.data.count === 1
      ? 'Tienes 1 cita activa. Si dejas de atender como doctor, se cancelará y se notificará al paciente.'
      : `Tienes ${this.data.count} citas activas. Si dejas de atender como doctor, se cancelarán y se notificará a los pacientes.`,
  );

  protected submit(): void {
    this.ref.close({ reason: this.reason().trim() });
  }
}
