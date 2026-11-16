import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { AppointmentStatus } from '../../../core/models/api.models';
import { STATUS_STYLE } from '../../../core/utils/labels.util';

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  private readonly i18n = inject(I18nService);
  status = input.required<AppointmentStatus>();

  protected readonly style = computed(() => STATUS_STYLE[this.status()]);
  protected readonly label = computed(() => {
    this.i18n.currentLang();
    return this.i18n.translate(`statuses.${this.status()}`);
  });
}
