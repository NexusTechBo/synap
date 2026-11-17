import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ClinicClockService } from '../../../../core/clinic/clinic-clock.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { addDays, formatShortDate, parseIso, toIso } from '../../../../core/utils/calendar.util';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { POPOVER_POSITIONS } from '../../../utils/overlay-positions.util';
import { UiIconComponent } from '../../ui-icon/ui-icon.component';
import { MonthGridComponent } from '../month-grid/month-grid.component';

export interface DateRange {
  from: string;
  to: string;
}

@Component({
  selector: 'app-date-range-picker',
  imports: [
    CdkTrapFocus,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MonthGridComponent,
    UiIconComponent,
    TranslatePipe,
  ],
  templateUrl: './date-range-picker.component.html',
  host: { class: 'relative' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateRangePickerComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangePickerComponent implements ControlValueAccessor {
  private readonly i18n = inject(I18nService);
  private readonly clock = inject(ClinicClockService);

  protected readonly positions = POPOVER_POSITIONS;
  protected readonly presets: { labelKey: string; range: () => DateRange }[] = [
    {
      labelKey: 'dateRangePicker.presets.today',
      range: () => ({ from: this.clock.today(), to: this.clock.today() }),
    },
    {
      labelKey: 'dateRangePicker.presets.next7Days',
      range: () => ({
        from: this.clock.today(),
        to: toIso(addDays(parseIso(this.clock.today()), 6)),
      }),
    },
    {
      labelKey: 'dateRangePicker.presets.thisMonth',
      range: () => {
        const now = parseIso(this.clock.today());
        return {
          from: toIso(new Date(now.getFullYear(), now.getMonth(), 1)),
          to: toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        };
      },
    },
  ];

  protected readonly isOpen = signal(false);
  protected readonly disabled = signal(false);
  protected readonly value = signal<DateRange | null>(null);
  protected readonly viewDate = signal(parseIso(this.clock.today()));
  protected readonly draftStart = signal<string | null>(null);
  protected readonly draftEnd = signal<string | null>(null);
  protected readonly hovered = signal<string | null>(null);
  private onChange: (value: DateRange) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly label = computed(() => {
    this.i18n.currentLang();
    const range = this.value();
    if (!range) return this.i18n.translate('dateRangePicker.placeholder');
    return range.from === range.to
      ? formatShortDate(range.from)
      : `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`;
  });

  writeValue(value: DateRange | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: DateRange) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected open(): void {
    const range = this.value();
    this.draftStart.set(range?.from ?? null);
    this.draftEnd.set(range?.to ?? null);
    this.viewDate.set(parseIso(range?.from ?? this.clock.today()));
    this.isOpen.set(true);
  }

  protected close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.hovered.set(null);
    this.onTouched();
  }

  protected pick(iso: string): void {
    const start = this.draftStart();
    if (!start || this.draftEnd()) {
      this.draftStart.set(iso);
      this.draftEnd.set(null);
      return;
    }
    this.commit(iso < start ? { from: iso, to: start } : { from: start, to: iso });
  }

  protected commit(range: DateRange): void {
    this.value.set(range);
    this.onChange(range);
    this.close();
  }
}
