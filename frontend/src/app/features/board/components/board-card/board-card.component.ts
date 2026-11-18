import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { AppointmentSummaryItem } from '../../../../core/models/api.models';
import { formatDayLabel } from '../../../../core/utils/calendar.util';
import { TimeRangePipe } from '../../../../shared/pipes/time-range.pipe';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { KeyboardActivateDirective } from '../../../../shared/ui/keyboard-activate/keyboard-activate.directive';
import { UiIconComponent } from '../../../../shared/ui/ui-icon/ui-icon.component';

@Component({
  selector: 'app-board-card',
  imports: [UiIconComponent, TimeRangePipe, TranslatePipe],
  templateUrl: './board-card.component.html',
  host: { class: 'block rounded-2xl' },
  hostDirectives: [KeyboardActivateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardCardComponent {
  private readonly i18n = inject(I18nService);

  appointment = input.required<AppointmentSummaryItem>();
  showDate = input(false);
  past = input(false);

  protected readonly dayLabel = computed(() => {
    const locale = this.i18n.intlLocale();
    return formatDayLabel(this.appointment().appointmentDate, locale);
  });
}
