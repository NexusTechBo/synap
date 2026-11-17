import { Injectable, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RegionsApi } from '../api/regions.api';
import { ClinicLanguage, CountryCode, RegionCountry } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class RegionsStore {
  private readonly api = inject(RegionsApi);
  private readonly resource = rxResource({ stream: () => this.api.catalog() });

  readonly countries = computed<RegionCountry[]>(() =>
    this.resource.hasValue() ? this.resource.value().countries : [],
  );
  readonly languages = computed<ClinicLanguage[]>(() =>
    this.resource.hasValue() ? this.resource.value().languages : [],
  );
  readonly isLoading = this.resource.isLoading;
  readonly hasError = computed(() => this.resource.status() === 'error');
  readonly available = computed(() => this.countries().length > 0);

  country(code: CountryCode | string | null | undefined): RegionCountry | undefined {
    return this.countries().find((country) => country.code === code);
  }

  reload(): void {
    this.resource.reload();
  }
}
