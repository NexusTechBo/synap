import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { ClinicClockService } from '../../../../core/clinic/clinic-clock.service';
import {
  addDays,
  formatMonthShort,
  formatWeekdayShort,
  parseIso,
  toIso,
} from '../../../../core/utils/calendar.util';

export const DATE_STRIP_DAYS = 14;

function dayChip(date: Date) {
  return {
    iso: toIso(date),
    weekday: formatWeekdayShort(date),
    day: date.getDate(),
    month: formatMonthShort(date),
  };
}

function chipStateClass(selected: boolean, unavailable: boolean): string {
  if (unavailable) {
    return selected
      ? 'cursor-default bg-gray-300 text-gray-700 ring-2 ring-gray-400'
      : 'cursor-not-allowed bg-gray-100 text-gray-400';
  }
  return selected
    ? 'cursor-pointer bg-primary text-white shadow-lg shadow-primary/30'
    : 'cursor-pointer bg-white/50 text-gray-600 hover:bg-white/80';
}

@Component({
  selector: 'app-date-strip',
  templateUrl: './date-strip.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateStripComponent {
  readonly selected = input.required<string>();
  readonly unavailableDates = input<readonly string[]>([]);
  readonly select = output<string>();

  private readonly clock = inject(ClinicClockService);

  private readonly nextDays = computed(() =>
    Array.from({ length: DATE_STRIP_DAYS }, (_, i) =>
      dayChip(addDays(parseIso(this.clock.today()), i)),
    ),
  );
  protected readonly days = computed(() => {
    const selected = this.selected();
    const unavailable = new Set(this.unavailableDates());
    const nextDays = this.nextDays();
    const days = nextDays.some((day) => day.iso === selected)
      ? nextDays
      : [...nextDays, dayChip(parseIso(selected))];
    return days.map((day) => {
      const isSelected = day.iso === selected;
      const isUnavailable = unavailable.has(day.iso);
      return {
        ...day,
        isSelected,
        isUnavailable,
        isDisabled: isUnavailable && !isSelected,
        stateClass: chipStateClass(isSelected, isUnavailable),
      };
    });
  });
}
