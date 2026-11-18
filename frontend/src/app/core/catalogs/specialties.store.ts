import { Injectable, computed, inject } from '@angular/core';
import { map } from 'rxjs';
import { CatalogsApi } from '../api/catalogs.api';
import { resourceError } from '../http/api-error';
import { I18nService } from '../i18n/i18n.service';
import { Specialty } from '../models/api.models';
import { clinicScopedResource } from './clinic-scoped-resource';

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

@Injectable({ providedIn: 'root' })
export class SpecialtiesStore {
  private readonly api = inject(CatalogsApi);
  private readonly i18n = inject(I18nService);
  private readonly cache = clinicScopedResource(() =>
    this.api.specialties().pipe(map((list) => [...list].sort(byName))),
  );
  private readonly resource = this.cache.resource;

  readonly specialties = computed(() => (this.resource.hasValue() ? this.resource.value() : []));
  readonly isLoading = this.resource.isLoading;
  readonly errorMessage = resourceError(
    this.resource,
    this.i18n,
    this.i18n.translate('errors.loadSpecialties'),
  );

  load(): void {
    this.cache.load();
  }

  reload(): void {
    this.cache.reload();
  }

  upsert(specialty: Specialty): void {
    if (this.resource.hasValue() && !this.resource.isLoading()) {
      this.resource.update((list) =>
        [...list.filter((s) => s.id !== specialty.id), specialty].sort(byName),
      );
    } else {
      this.cache.invalidate();
    }
  }
}
