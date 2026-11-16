import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
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
  imports: [DialogFrameComponent, TranslatePipe],
  templateUrl: './doctor-mode-appointments-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DoctorModeAppointmentsDialogComponent {
  private readonly i18n = inject(I18nService);
  protected readonly data = inject<DoctorModeAppointmentsData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<DoctorModeAppointmentsResult>>(DialogRef);

  protected readonly maxLength = REASON_MAX_LENGTH;
  protected readonly reason = signal('');
  protected readonly message = computed(() => {
    this.i18n.currentLang();
    if (this.data.count === 1) {
      return this.i18n.translate('profile.doctorMode.appointmentsDialog.messageSingular');
    }
    return `${this.i18n.translate('profile.doctorMode.appointmentsDialog.messagePluralPrefix')} ${this.data.count} ${this.i18n.translate('profile.doctorMode.appointmentsDialog.messagePluralSuffix')}`;
  });

  protected submit(): void {
    this.ref.close({ reason: this.reason().trim() });
  }
}
