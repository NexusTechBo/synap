import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DialogFrameComponent } from '../../ui/dialog-frame/dialog-frame.component';
import { UiIconComponent } from '../../ui/ui-icon/ui-icon.component';

export interface CancelAppointmentData {
  patientName: string;
  when: string;
}

export interface CancelAppointmentResult {
  reason: string;
}

const REASON_MAX_LENGTH = 500;

const QUICK_REASON_KEYS = [
  'doctorUnavailable',
  'patientRequested',
  'medicalEmergency',
  'reschedule',
  'scheduleChange',
] as const;

@Component({
  selector: 'app-cancel-appointment-dialog',
  imports: [DialogFrameComponent, UiIconComponent, TranslatePipe],
  templateUrl: './cancel-appointment-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelAppointmentDialogComponent {
  private readonly i18n = inject(I18nService);
  protected readonly data = inject<CancelAppointmentData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<CancelAppointmentResult>>(DialogRef);

  protected readonly quickReasons = computed(() => {
    this.i18n.currentLang();
    return QUICK_REASON_KEYS.map((key) =>
      this.i18n.translate(`shared.cancelDialog.quickReasons.${key}`),
    );
  });
  protected readonly maxLength = REASON_MAX_LENGTH;
  protected readonly reason = signal('');

  protected pick(option: string): void {
    this.reason.update((current) => (current === option ? '' : option));
  }

  protected submit(): void {
    this.ref.close({ reason: this.reason().trim() });
  }
}
