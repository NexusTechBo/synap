import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { DialogFrameComponent } from '../../../../shared/ui/dialog-frame/dialog-frame.component';
import { FormFieldComponent } from '../../../../shared/ui/forms/form-field/form-field.component';

export interface GuestLinkData {
  url: string;
}

@Component({
  selector: 'app-guest-link-dialog',
  imports: [
    AlertComponent,
    CdkCopyToClipboard,
    DialogFrameComponent,
    FormFieldComponent,
    TranslatePipe,
  ],
  templateUrl: './guest-link-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestLinkDialogComponent {
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  protected readonly ref = inject(DialogRef);
  protected readonly link = inject<GuestLinkData>(DIALOG_DATA);
  protected readonly copyFailed = signal(false);

  protected onCopied(copied: boolean): void {
    if (!copied) {
      this.copyFailed.set(true);
      return;
    }
    this.notifications.success(this.i18n.translate('appointments.guestLink.copied'));
    this.ref.close();
  }
}
