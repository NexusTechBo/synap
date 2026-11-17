import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GuestBookingPatient } from '../../../../core/models/api.models';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { FormFieldComponent } from '../../../../shared/ui/forms/form-field/form-field.component';
import {
  CI_ERRORS,
  PHONE_ERRORS,
  ciValidator,
  notBlank,
  phoneValidator,
} from '../../../../shared/utils/validators.util';

type PatientKind = 'returning' | 'new';

@Component({
  selector: 'app-guest-patient-form',
  imports: [FormFieldComponent, ReactiveFormsModule, TranslatePipe],
  templateUrl: './guest-patient-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestPatientFormComponent implements OnInit {
  readonly initial = input<GuestBookingPatient | null>(null);
  readonly submitted = output<GuestBookingPatient>();
  readonly back = output<void>();

  protected readonly ciErrors = CI_ERRORS;
  protected readonly phoneErrors = PHONE_ERRORS;
  protected readonly kinds: { id: PatientKind; labelKey: string }[] = [
    { id: 'returning', labelKey: 'guestBooking.patientForm.returningLabel' },
    { id: 'new', labelKey: 'guestBooking.patientForm.newLabel' },
  ];

  protected readonly form = inject(FormBuilder).nonNullable.group({
    kind: [null as PatientKind | null, Validators.required],
    ci: [{ value: '', disabled: true }, ciValidator],
    phoneNumber: ['', [notBlank, phoneValidator]],
    name: [{ value: '', disabled: true }, notBlank],
    email: [{ value: '', disabled: true }, Validators.email],
  });
  protected readonly kind = toSignal(this.form.controls.kind.valueChanges, { initialValue: null });

  constructor() {
    this.form.controls.kind.valueChanges.pipe(takeUntilDestroyed()).subscribe((kind) => {
      const { ci, name, email } = this.form.controls;
      for (const control of [ci, name, email]) {
        if (kind === 'new') control.enable();
        else control.disable();
      }
    });
  }

  ngOnInit(): void {
    const initial = this.initial();
    if (!initial) return;
    this.form.patchValue({
      kind: initial.name ? 'new' : 'returning',
      ci: initial.ci ?? '',
      phoneNumber: initial.phoneNumber,
      name: initial.name ?? '',
      email: initial.email ?? '',
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const phoneNumber = this.form.controls.phoneNumber.value.trim();
    if (this.kind() === 'returning') {
      this.submitted.emit({ phoneNumber });
      return;
    }
    this.submitted.emit({
      ci: this.form.controls.ci.value.trim() || null,
      phoneNumber,
      name: this.form.controls.name.value.trim(),
      email: this.form.controls.email.value.trim() || null,
    });
  }
}
