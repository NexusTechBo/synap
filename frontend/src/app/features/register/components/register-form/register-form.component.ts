import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';
import { DEFAULT_COUNTRY } from '../../../../core/clinic/clinic-country.service';
import { RegionsStore } from '../../../../core/clinic/regions.store';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { ClinicRequest } from '../../../../core/models/api.models';
import {
  RegionalFieldsComponent,
  createRegionalForm,
} from '../../../../shared/components/regional-fields/regional-fields.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { FormFieldComponent } from '../../../../shared/ui/forms/form-field/form-field.component';
import { DOCUMENT_MAX_LENGTH } from '../../../../shared/utils/document.util';
import {
  PHONE_ERRORS,
  USERNAME_ERRORS,
  documentValidator,
  notBlank,
  phoneValidator,
  usernameValidator,
} from '../../../../shared/utils/validators.util';
import { RegisterService } from '../../register.service';

@Component({
  selector: 'app-register-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormFieldComponent,
    RegionalFieldsComponent,
    TranslatePipe,
  ],
  templateUrl: './register-form.component.html',
  host: { class: 'flex min-h-screen items-center justify-center px-4 py-10 sm:px-6' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterFormComponent {
  protected readonly register = inject(RegisterService);
  private readonly regions = inject(RegionsStore);
  private readonly i18n = inject(I18nService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', notBlank],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]{3,50}$/)]],
    phoneNumber: ['', [notBlank, phoneValidator]],
    adminName: ['', notBlank],
    adminDocument: [''],
    adminUsername: ['', [Validators.required, usernameValidator]],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]],
    regional: createRegionalForm({ country: 'BO' }),
  });

  protected readonly phoneErrors = PHONE_ERRORS;
  protected readonly slugErrors = {
    pattern: 'register.slugPatternError',
  };
  protected readonly usernameErrors = USERNAME_ERRORS;
  protected readonly suffix = toSignal(
    this.form.controls.slug.valueChanges.pipe(
      map((value) => (this.form.controls.slug.valid ? value : '')),
    ),
    { initialValue: '' },
  );

  private readonly country = toSignal(
    this.form.controls.regional.controls.country.valueChanges.pipe(
      startWith(this.form.controls.regional.controls.country.value),
    ),
    { initialValue: '' as const },
  );
  protected readonly documentCountry = computed(() => this.country() || DEFAULT_COUNTRY);
  protected readonly documentMaxLength = computed(
    () => DOCUMENT_MAX_LENGTH[this.documentCountry()],
  );
  protected readonly regionalAvailable = this.regions.available;
  protected readonly phonePlaceholder = computed(() => {
    this.i18n.currentLang();
    return (
      this.regions.country(this.country())?.phonePlaceholder ??
      this.i18n.translate('register.clinicPhoneGenericPlaceholder')
    );
  });

  constructor() {
    this.form.controls.regional.controls.country.valueChanges
      .pipe(startWith(this.form.controls.regional.controls.country.value), takeUntilDestroyed())
      .subscribe((country) => {
        const { adminDocument } = this.form.controls;
        adminDocument.setValidators(documentValidator(country || DEFAULT_COUNTRY));
        adminDocument.updateValueAndValidity();
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { regional, ...clinic } = this.form.getRawValue();
    const request: ClinicRequest = { ...clinic };
    if (
      this.regionalAvailable() &&
      regional.country &&
      regional.timezone &&
      regional.defaultLanguage
    ) {
      request.country = regional.country;
      request.timezone = regional.timezone;
      request.defaultLanguage = regional.defaultLanguage;
    }
    this.register.register(request);
  }
}
