import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize, map, merge } from 'rxjs';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { toIso } from '../../../../core/utils/calendar.util';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { DialogFrameComponent } from '../../../../shared/ui/dialog-frame/dialog-frame.component';
import { DatePickerComponent } from '../../../../shared/ui/forms/date-picker/date-picker.component';
import { FormFieldComponent } from '../../../../shared/ui/forms/form-field/form-field.component';
import { TimePickerComponent } from '../../../../shared/ui/forms/time-picker/time-picker.component';
import { AvailabilityService } from '../../availability.service';

export function exceptionEndAfterStart(control: AbstractControl): ValidationErrors | null {
  const group = control.parent;
  if (!group || group.get('isFullDayBlock')?.value) return null;
  const startTime = group.get('startTime')?.value as string;
  if (!startTime || !control.value) return { rangeRequired: true };
  return control.value <= startTime ? { endBeforeStart: true } : null;
}

@Component({
  selector: 'app-exception-form-dialog',
  imports: [
    AlertComponent,
    DialogFrameComponent,
    DatePickerComponent,
    FormFieldComponent,
    TimePickerComponent,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './exception-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExceptionFormDialogComponent {
  private readonly submitButton = viewChild.required<ElementRef<HTMLButtonElement>>('submitButton');

  private readonly availability = inject(AvailabilityService);
  private readonly i18n = inject(I18nService);
  private readonly injector = inject(Injector);
  protected readonly ref = inject(DialogRef);

  protected readonly today = toIso(new Date());
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    date: [this.today, Validators.required],
    isFullDayBlock: [true],
    startTime: ['09:00'],
    endTime: ['10:00', exceptionEndAfterStart],
    reason: [''],
  });

  protected readonly dateErrors = computed(() => {
    this.i18n.currentLang();
    return {
      required: this.i18n.translate('availability.exceptionDialog.dateRequired'),
    };
  });

  protected readonly endErrors = computed(() => {
    this.i18n.currentLang();
    return {
      endBeforeStart: this.i18n.translate('validation.endBeforeStart'),
      rangeRequired: this.i18n.translate('validation.rangeRequired'),
    };
  });

  protected readonly rangeInvalid = toSignal(
    this.form.controls.endTime.events.pipe(
      map(() => this.form.controls.endTime.touched && this.form.controls.endTime.invalid),
    ),
    { initialValue: false },
  );

  constructor() {
    const { startTime, isFullDayBlock, endTime } = this.form.controls;
    merge(startTime.valueChanges, isFullDayBlock.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        endTime.updateValueAndValidity();
        endTime.markAsTouched();
      });
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.error.set(null));
  }

  protected save(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    let saved = false;
    this.availability
      .addException({
        date: value.date,
        isFullDayBlock: value.isFullDayBlock,
        startTime: value.isFullDayBlock ? null : value.startTime,
        endTime: value.isFullDayBlock ? null : value.endTime,
        reason: value.reason.trim() || null,
      })
      .pipe(
        finalize(() => {
          this.saving.set(false);
          if (!saved)
            afterNextRender(() => this.submitButton().nativeElement.focus(), {
              injector: this.injector,
            });
        }),
      )
      .subscribe({
        next: () => {
          saved = true;
          this.ref.close();
        },
        error: (error) =>
          this.error.set(
            apiErrorMessage(error, this.i18n.translate('availability.errors.saveException')),
          ),
      });
  }
}
