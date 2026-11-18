import { CdkTrapFocus } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ClinicClockService } from '../../../../core/clinic/clinic-clock.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { formatShortDate, parseIso } from '../../../../core/utils/calendar.util';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { POPOVER_POSITIONS } from '../../../utils/overlay-positions.util';
import { UiIconComponent } from '../../ui-icon/ui-icon.component';
import { MonthGridComponent } from '../month-grid/month-grid.component';

@Component({
  selector: 'app-date-picker',
  imports: [
    CdkTrapFocus,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MonthGridComponent,
    TranslatePipe,
    UiIconComponent,
  ],
  templateUrl: './date-picker.component.html',
  host: { class: 'relative', '[attr.id]': 'null' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatePickerComponent implements ControlValueAccessor {
  readonly min = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly id = input<string | null>(null);

  private readonly i18n = inject(I18nService);
  protected readonly today = inject(ClinicClockService).today();
  protected readonly positions = POPOVER_POSITIONS;
  protected readonly isOpen = signal(false);
  protected readonly disabled = signal(false);
  protected readonly value = signal<string | null>(null);
  protected readonly viewDate = signal(parseIso(this.today));
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly label = computed(() => {
    const value = this.value();
    return value
      ? formatShortDate(value, this.i18n.intlLocale())
      : this.i18n.translate('datePicker.placeholder');
  });

  writeValue(value: string | null): void {
    this.value.set(value || null);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected open(): void {
    this.viewDate.set(parseIso(this.value() ?? this.min() ?? this.today));
    this.isOpen.set(true);
  }

  protected close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
  }

  protected pick(iso: string): void {
    if (this.outOfBounds(iso)) return;
    this.value.set(iso);
    this.onChange(iso);
    this.close();
  }

  protected outOfBounds(iso: string): boolean {
    const min = this.min();
    return !!min && iso < min;
  }
}
