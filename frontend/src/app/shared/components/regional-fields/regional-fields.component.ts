import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { RegionsStore } from '../../../core/clinic/regions.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  ClinicLanguage,
  ClinicRegionalSettings,
  CountryCode,
} from '../../../core/models/api.models';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { FormFieldComponent } from '../../ui/forms/form-field/form-field.component';
import { SelectComponent, SelectOption } from '../../ui/forms/select/select.component';

export type RegionalForm = FormGroup<{
  country: FormControl<CountryCode | ''>;
  timezone: FormControl<string>;
  defaultLanguage: FormControl<ClinicLanguage | ''>;
}>;

export function createRegionalForm(
  initial: Partial<ClinicRegionalSettings> = {},
  validators: ValidatorFn[] = [],
): RegionalForm {
  return new FormGroup({
    country: new FormControl<CountryCode | ''>(initial.country ?? '', {
      nonNullable: true,
      validators,
    }),
    timezone: new FormControl(initial.timezone ?? '', { nonNullable: true, validators }),
    defaultLanguage: new FormControl<ClinicLanguage | ''>(initial.defaultLanguage ?? '', {
      nonNullable: true,
      validators,
    }),
  });
}

@Component({
  selector: 'app-regional-fields',
  imports: [ReactiveFormsModule, FormFieldComponent, SelectComponent, TranslatePipe],
  templateUrl: './regional-fields.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionalFieldsComponent {
  readonly form = input.required<RegionalForm>();
  readonly idPrefix = input('regional');

  private readonly regions = inject(RegionsStore);
  private readonly i18n = inject(I18nService);

  private readonly countryCode = signal<CountryCode | ''>('');
  protected readonly selectedCountry = computed(() => this.regions.country(this.countryCode()));

  protected readonly countryOptions = computed<SelectOption<CountryCode | ''>[]>(() => {
    this.i18n.currentLang();
    return this.regions.countries().map(({ code }) => ({
      value: code,
      label: this.label(`regional.countries.${code}`, code),
    }));
  });
  protected readonly timezoneOptions = computed<SelectOption<string>[]>(() =>
    (this.selectedCountry()?.timezones ?? []).map((timezone) => ({
      value: timezone,
      label: timezone,
    })),
  );
  protected readonly languageOptions = computed<SelectOption<ClinicLanguage | ''>[]>(() => {
    this.i18n.currentLang();
    return this.regions.languages().map((language) => ({
      value: language,
      label: this.label(`regional.languages.${language}`, language),
    }));
  });
  private readonly singleTimezone = computed(() => this.timezoneOptions().length === 1);

  constructor() {
    effect((onCleanup) => {
      const { country } = this.form().controls;
      this.countryCode.set(country.value);
      const subscription = country.valueChanges.subscribe((code) => this.countryCode.set(code));
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => {
      const country = this.selectedCountry();
      const { timezone, defaultLanguage } = this.form().controls;
      if (!country) return;
      untracked(() => {
        if (!country.timezones.includes(timezone.value)) timezone.setValue(country.defaultTimezone);
        if (!defaultLanguage.value) defaultLanguage.setValue(country.defaultLanguage);
      });
    });

    effect(() => {
      const { timezone } = this.form().controls;
      const single = this.singleTimezone();
      untracked(() =>
        single ? timezone.disable({ emitEvent: false }) : timezone.enable({ emitEvent: false }),
      );
    });
  }

  protected onCountryChange(code: CountryCode | ''): void {
    const country = this.regions.country(code);
    if (!country) return;
    const { timezone, defaultLanguage } = this.form().controls;
    timezone.setValue(country.defaultTimezone);
    defaultLanguage.setValue(country.defaultLanguage);
  }

  private label(key: string, fallback: string): string {
    const text = this.i18n.translate(key);
    return text === key ? fallback : text;
  }
}
