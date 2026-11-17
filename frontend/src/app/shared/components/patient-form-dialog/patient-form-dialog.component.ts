import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { apiErrorMessage } from '../../../core/http/api-error';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Patient } from '../../../core/models/api.models';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AlertComponent } from '../../ui/alert/alert.component';
import { DialogFrameComponent } from '../../ui/dialog-frame/dialog-frame.component';
import { FormFieldComponent } from '../../ui/forms/form-field/form-field.component';
import {
  CI_ERRORS,
  PHONE_ERRORS,
  ciValidator,
  notBlank,
  phoneValidator,
} from '../../utils/validators.util';
import { PatientFormService } from './patient-form.service';

export interface PatientFormData {
  patient?: Patient;
}

@Component({
  selector: 'app-patient-form-dialog',
  imports: [
    AlertComponent,
    DialogFrameComponent,
    FormFieldComponent,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './patient-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientFormDialogComponent {
  private readonly patients = inject(PatientFormService);
  private readonly i18n = inject(I18nService);
  protected readonly ref = inject<DialogRef<Patient>>(DialogRef);
  protected readonly patient = inject<PatientFormData>(DIALOG_DATA).patient;

  protected readonly ciErrors = CI_ERRORS;
  protected readonly phoneErrors = PHONE_ERRORS;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.patient?.name ?? '', notBlank],
    phoneNumber: [this.patient?.phoneNumber ?? '', [notBlank, phoneValidator]],
    email: [this.patient?.email ?? '', Validators.email],
    ci: [this.patient?.ci ?? '', [ciValidator]],
  });

  protected save(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, phoneNumber, ci } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.patients
      .save(this.patient, {
        name: name.trim(),
        ci: ci.trim() || null,
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => this.ref.close(saved),
        error: (error) =>
          this.error.set(
            apiErrorMessage(error, this.i18n.translate('patients.formDialog.saveError')),
          ),
      });
  }
}
