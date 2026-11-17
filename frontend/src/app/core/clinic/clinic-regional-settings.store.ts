import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Observable, map, tap } from 'rxjs';
import { ClinicSettingsApi } from '../api/clinic-settings.api';
import { AuthService } from '../auth/auth.service';
import { ClinicRegionalSettings } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ClinicRegionalSettingsStore {
  private readonly api = inject(ClinicSettingsApi);
  private readonly auth = inject(AuthService);

  private readonly current = linkedSignal<ClinicRegionalSettings | null>(() =>
    this.auth.regionalSettings(),
  );
  private readonly requested = linkedSignal({
    source: () => this.auth.session()?.clinicId,
    computation: () => false,
  });

  private readonly resource = rxResource({
    params: () => {
      const clinicId = this.auth.session()?.clinicId;
      return this.requested() && clinicId !== undefined ? { clinicId } : undefined;
    },
    stream: () => this.api.regionalSettings().pipe(tap((settings) => this.current.set(settings))),
  });

  readonly settings = this.current.asReadonly();
  readonly isLoading = computed(() => this.resource.isLoading());
  readonly hasError = computed(() => this.resource.status() === 'error');

  load(): void {
    if (this.resource.status() === 'error') this.resource.reload();
    else this.requested.set(true);
  }

  update(settings: ClinicRegionalSettings): Observable<ClinicRegionalSettings> {
    return this.api.updateRegionalSettings(settings).pipe(
      tap(({ token, settings: saved }) => {
        this.auth.replaceToken(token);
        this.current.set(saved);
      }),
      map(({ settings: saved }) => saved),
    );
  }
}
