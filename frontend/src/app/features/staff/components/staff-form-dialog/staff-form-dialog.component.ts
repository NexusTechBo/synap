import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Observable, finalize, startWith } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { ClinicCountryService } from '../../../../core/clinic/clinic-country.service';
import { apiErrorMessage } from '../../../../core/http/api-error';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { Role, Staff } from '../../../../core/models/api.models';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { AlertComponent } from '../../../../shared/ui/alert/alert.component';
import { DialogFrameComponent } from '../../../../shared/ui/dialog-frame/dialog-frame.component';
import { FormFieldComponent } from '../../../../shared/ui/forms/form-field/form-field.component';
import { SelectComponent, SelectOption } from '../../../../shared/ui/forms/select/select.component';
import { DOCUMENT_MAX_LENGTH } from '../../../../shared/utils/document.util';
import {
  documentValidator,
  notBlank,
  phoneValidator,
  usernameValidator,
} from '../../../../shared/utils/validators.util';
import { StaffService } from '../../staff.service';

export interface StaffFormData {
  staff?: Staff;
}

function specialtyForDoctor(control: AbstractControl): ValidationErrors | null {
  return control.parent?.get('role')?.value === 'DOCTOR' && !control.value
    ? { required: true }
    : null;
}

const EDITABLE_ROLES: Role[] = ['DOCTOR', 'ASSISTANT'];

function initialRole(staff: Staff | undefined): Role {
  if (!staff) return 'DOCTOR';
  return staff.alsoDoctor ? 'DOCTOR' : staff.role;
}

@Component({
  selector: 'app-staff-form-dialog',
  imports: [
    AlertComponent,
    DialogFrameComponent,
    FormFieldComponent,
    ReactiveFormsModule,
    SelectComponent,
    TranslatePipe,
  ],
  templateUrl: './staff-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StaffFormDialogComponent {
  private readonly staffService = inject(StaffService);
  private readonly i18n = inject(I18nService);
  protected readonly ref = inject(DialogRef);
  protected readonly staff = inject<StaffFormData>(DIALOG_DATA).staff;

  private readonly clinic = inject(AuthService).clinic;
  private readonly clinicCountry = inject(ClinicCountryService);
  protected readonly country = this.clinicCountry.country;
  protected readonly phonePlaceholder = this.clinicCountry.phonePlaceholder;
  protected readonly documentMaxLength = DOCUMENT_MAX_LENGTH[this.country()];
  protected readonly canChangeRole = this.staff?.role !== 'ADMINISTRATOR';

  protected readonly roles = computed(() => {
    this.i18n.currentLang();
    return EDITABLE_ROLES.map((role) => ({
      id: role,
      label: this.i18n.translate(`roles.${role}`),
    }));
  });

  protected readonly usernameErrors = computed(() => {
    this.i18n.currentLang();
    return { pattern: this.i18n.translate('validation.usernamePattern') };
  });

  protected readonly phoneErrors = computed(() => {
    this.i18n.currentLang();
    return { pattern: this.i18n.translate('validation.phonePattern') };
  });

  protected readonly specialtyErrors = computed(() => {
    this.i18n.currentLang();
    return { required: this.i18n.translate('staff.formDialog.specialtyRequired') };
  });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    role: [initialRole(this.staff)],
    name: [this.staff?.name ?? '', notBlank],
    email: [this.staff?.email ?? '', [Validators.required, Validators.email]],
    phoneNumber: [this.staff?.phoneNumber ?? '', phoneValidator],
    document: ['', this.staff ? [] : [documentValidator(this.country())]],
    username: ['', this.staff ? [] : [Validators.required, usernameValidator]],
    password: [
      '',
      this.staff ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8)],
    ],
    specialtyId: [this.staff?.specialtyId ?? null, specialtyForDoctor],
  });

  protected readonly clinicSuffix = computed(() => {
    const clinic = this.clinic();
    return clinic ? `@${clinic.slug}.com` : '';
  });
  private readonly role = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });
  protected readonly isDoctor = computed(() => this.role() === 'DOCTOR');
  protected readonly specialtyOptions = computed<SelectOption<number | null>[]>(() =>
    this.staffService.specialties().map((s) => ({ value: s.id, label: s.name })),
  );

  constructor() {
    this.form.controls.role.valueChanges
      .pipe(startWith(null), takeUntilDestroyed())
      .subscribe(() => this.form.controls.specialtyId.updateValueAndValidity());
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.error.set(null));
  }

  protected save(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const common = {
      name: value.name.trim(),
      email: value.email.trim(),
      phoneNumber: value.phoneNumber.trim() || null,
      role: value.role,
      specialtyId: value.role === 'DOCTOR' ? value.specialtyId : null,
    };
    const request: Observable<Staff> = this.staff
      ? this.staffService.update(this.staff.id, { ...common, password: value.password || null })
      : this.staffService.create({
          ...common,
          document: value.document.trim() || null,
          username: value.username,
          password: value.password,
        });

    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.ref.close(),
      error: (error) =>
        this.error.set(apiErrorMessage(error, this.i18n.translate('staff.errors.save'))),
    });
  }
}
