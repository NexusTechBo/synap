import { Injectable, computed, inject, isDevMode } from '@angular/core';
import { map } from 'rxjs';
import { StaffApi } from '../api/staff.api';
import { resourceError } from '../http/api-error';
import { I18nService } from '../i18n/i18n.service';
import { clinicScopedResource } from './clinic-scoped-resource';

const MAX_DOCTORS = 500;

@Injectable({ providedIn: 'root' })
export class DoctorsStore {
  private readonly api = inject(StaffApi);
  private readonly i18n = inject(I18nService);
  private readonly cache = clinicScopedResource(() =>
    this.api.doctors({ isActive: true, size: MAX_DOCTORS }).pipe(
      map(({ content, page }) => {
        if (isDevMode() && page.totalElements > content.length) {
          console.warn(`DoctorsStore: showing ${content.length} of ${page.totalElements} doctors`);
        }
        return content;
      }),
    ),
  );
  private readonly resource = this.cache.resource;

  readonly doctors = computed(() => (this.resource.hasValue() ? this.resource.value() : []));
  readonly isLoading = this.resource.isLoading;
  readonly errorMessage = resourceError(
    this.resource,
    this.i18n,
    this.i18n.translate('errors.loadDoctors'),
  );

  load(): void {
    this.cache.load();
  }

  reload(): void {
    this.cache.reload();
  }

  invalidate(): void {
    this.cache.invalidate();
  }
}
