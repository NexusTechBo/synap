import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { finalize, retry, throwError, timer } from 'rxjs';
import { RegionsApi } from '../api/regions.api';
import { ClinicLanguage, CountryCode, RegionCountry } from '../models/api.models';

const TRANSIENT_STATUSES = new Set([0, 502, 503, 504]);
const MAX_RETRIES = 7;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 5_000;

function isTransient(error: unknown): boolean {
  return error instanceof HttpErrorResponse && TRANSIENT_STATUSES.has(error.status);
}

@Injectable({ providedIn: 'root' })
export class RegionsStore {
  private readonly api = inject(RegionsApi);
  private readonly _retrying = signal(false);
  private readonly resource = rxResource({
    stream: () =>
      this.api.catalog().pipe(
        retry({
          count: MAX_RETRIES,
          delay: (error, attempt) => {
            if (!isTransient(error)) return throwError(() => error);
            this._retrying.set(true);
            return timer(Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS));
          },
        }),
        finalize(() => this._retrying.set(false)),
      ),
  });

  readonly countries = computed<RegionCountry[]>(() =>
    this.resource.hasValue() ? this.resource.value().countries : [],
  );
  readonly languages = computed<ClinicLanguage[]>(() =>
    this.resource.hasValue() ? this.resource.value().languages : [],
  );
  readonly isLoading = this.resource.isLoading;
  readonly retrying = this._retrying.asReadonly();
  readonly hasError = computed(() => this.resource.status() === 'error');
  readonly available = computed(() => this.countries().length > 0);

  country(code: CountryCode | string | null | undefined): RegionCountry | undefined {
    return this.countries().find((country) => country.code === code);
  }

  reload(): void {
    this.resource.reload();
  }
}
