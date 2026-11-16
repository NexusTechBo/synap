import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { DialogFrameComponent } from '../../../../shared/ui/dialog-frame/dialog-frame.component';
import { LoadErrorComponent } from '../../../../shared/ui/load-error/load-error.component';
import { SkeletonComponent } from '../../../../shared/ui/skeleton/skeleton.component';
import { WhatsappQrService } from './whatsapp-qr.service';

@Component({
  selector: 'app-whatsapp-qr',
  imports: [DialogFrameComponent, LoadErrorComponent, SkeletonComponent, TranslatePipe],
  providers: [WhatsappQrService],
  templateUrl: './whatsapp-qr.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappQrComponent {
  private readonly confirm = inject(ConfirmService);
  private readonly i18n = inject(I18nService);
  protected readonly whatsapp = inject(WhatsappQrService);
  protected readonly ref = inject(DialogRef);

  protected logout(): void {
    if (this.whatsapp.loggingOut()) return;
    this.confirm
      .confirmThen(
        {
          title: this.i18n.translate('profile.whatsapp.unlinkConfirmTitle'),
          message: this.i18n.translate('profile.whatsapp.unlinkConfirmMessage'),
          confirmLabel: this.i18n.translate('profile.whatsapp.unlinkConfirmLabel'),
          danger: true,
        },
        () => this.whatsapp.logout(),
        this.i18n.translate('profile.whatsapp.unlinkedSuccess'),
        this.i18n.translate('profile.whatsapp.unlinkError'),
      )
      .subscribe();
  }
}
