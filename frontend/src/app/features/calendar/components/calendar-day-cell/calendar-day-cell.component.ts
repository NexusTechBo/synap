import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ClinicClockService } from '../../../../core/clinic/clinic-clock.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { AppointmentSummaryItem } from '../../../../core/models/api.models';
import { CalendarDay, formatLongDate } from '../../../../core/utils/calendar.util';
import { APPOINTMENT_STATUSES, STATUS_STYLE } from '../../../../core/utils/labels.util';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-calendar-day-cell',
  imports: [TranslatePipe],
  templateUrl: './calendar-day-cell.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarDayCellComponent {
  private readonly i18n = inject(I18nService);

  day = input.required<CalendarDay>();
  appointments = input<AppointmentSummaryItem[] | null>(null);
  selected = input(false);

  select = output<string>();

  protected readonly today = inject(ClinicClockService).today();

  protected readonly dotTones = computed(() => {
    const present = new Set((this.appointments() ?? []).map((appointment) => appointment.status));
    return APPOINTMENT_STATUSES.filter((status) => present.has(status)).map(
      (status) => STATUS_STYLE[status].dot,
    );
  });
  protected readonly count = computed(() => this.appointments()?.length ?? null);
  protected readonly ariaLabel = computed(() => {
    const locale = this.i18n.currentLang() === 'en' ? 'en-US' : 'es-ES';
    const date = formatLongDate(this.day().iso, locale);
    const count = this.count();
    if (count === null) return date;
    const unit = this.i18n.translate(
      count === 1 ? 'calendar.appointmentSingular' : 'calendar.appointmentPlural',
    );
    return `${date}, ${count} ${unit}`;
  });
}
