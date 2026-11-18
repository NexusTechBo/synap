import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize, map } from 'rxjs';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { DayOfWeek } from '../../../../core/models/api.models';
import { addMinutesToTime } from '../../../../core/utils/calendar.util';
import { DAYS_OF_WEEK } from '../../../../core/utils/labels.util';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { DialogFrameComponent } from '../../../../shared/ui/dialog-frame/dialog-frame.component';
import { FormFieldComponent } from '../../../../shared/ui/forms/form-field/form-field.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/forms/select/select.component';
import { TimePickerComponent } from '../../../../shared/ui/forms/time-picker/time-picker.component';
import { AvailabilityService } from '../../availability.service';

export function availabilityEndAfterStart(control: AbstractControl): ValidationErrors | null {
  const startTime = control.parent?.get('startTime')?.value as string | undefined;
  return startTime && control.value && control.value <= startTime ? { endBeforeStart: true } : null;
}

@Component({
  selector: 'app-availability-form-dialog',
  imports: [
    AlertComponent,
    DialogFrameComponent,
    ReactiveFormsModule,
    FormFieldComponent,
    SelectComponent,
    TimePickerComponent,
    TranslatePipe,
  ],
  templateUrl: './availability-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailabilityFormDialogComponent {
  private readonly availability = inject(AvailabilityService);
  private readonly i18n = inject(I18nService);
  protected readonly ref = inject(DialogRef);

  protected readonly days = computed(() => {
    this.i18n.currentLang();
    return DAYS_OF_WEEK.map((day) => ({
      value: day,
      label: this.i18n.translate(`days.${day}.label`),
      short: this.i18n.translate(`days.${day}.short`),
    }));
  });

  protected readonly durationOptions = computed<SelectOption<number>[]>(() => {
    this.i18n.currentLang();
    const unit = this.i18n.translate('availability.formDialog.minutesUnit');
    return [15, 20, 30, 45, 60].map((minutes) => ({
      value: minutes,
      label: `${minutes} ${unit}`,
    }));
  });

  protected readonly selectedDays = signal<Set<DayOfWeek>>(new Set(['MONDAY']));
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    startTime: ['08:00', Validators.required],
    endTime: ['12:00', [Validators.required, availabilityEndAfterStart]],
    slotDurationMinutes: [30, [Validators.required, Validators.min(5)]],
  });

  protected readonly endErrors = computed(() => {
    this.i18n.currentLang();
    return {
      endBeforeStart: this.i18n.translate('validation.endBeforeStart'),
    };
  });

  private readonly startTime = toSignal(this.form.controls.startTime.valueChanges, {
    initialValue: this.form.controls.startTime.value,
  });
  protected readonly endMin = computed(() => addMinutesToTime(this.startTime(), 30));
  protected readonly rangeInvalid = toSignal(
    this.form.controls.endTime.events.pipe(
      map(() => {
        const end = this.form.controls.endTime;
        return end.touched && end.hasError('endBeforeStart');
      }),
    ),
    { initialValue: false },
  );

  constructor() {
    this.form.controls.startTime.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const end = this.form.controls.endTime;
      end.updateValueAndValidity();
      end.markAsTouched();
    });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.error.set(null));
  }

  protected toggleDay(day: DayOfWeek): void {
    this.error.set(null);
    this.selectedDays.update((days) => {
      const next = new Set(days);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  protected save(): void {
    if (this.saving()) return;
    if (this.form.invalid || !this.selectedDays().size) {
      this.form.markAllAsTouched();
      return;
    }
    const currentDays = this.days();
    const days = currentDays.map((d) => d.value).filter((day) => this.selectedDays().has(day));
    this.saving.set(true);
    this.availability
      .addAvailability(days, this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe(({ saved, failed }) => {
        if (!failed.length) {
          this.ref.close();
          return;
        }
        this.selectedDays.set(new Set(failed.map((f) => f.day)));
        const label = (day: DayOfWeek) => currentDays.find((d) => d.value === day)!.label;
        const savedPrefix = this.i18n.translate('availability.formDialog.savedSummaryPrefix');
        const failedPrefix = this.i18n.translate('availability.formDialog.failedSummaryPrefix');
        this.error.set(
          (saved.length ? `${savedPrefix} ${saved.map(label).join(', ')}. ` : '') +
            `${failedPrefix} ${failed.map((f) => `${label(f.day)} (${f.message})`).join('; ')}`,
        );
      });
  }
}
