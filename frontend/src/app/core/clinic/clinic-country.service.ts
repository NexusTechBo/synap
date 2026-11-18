import { Injectable, computed, inject } from '@angular/core';
import { GuestSessionService } from '../auth/guest-session.service';
import { CountryCode } from '../models/api.models';
import { ClinicRegionalSettingsStore } from './clinic-regional-settings.store';
import { RegionsStore } from './regions.store';

export const DEFAULT_COUNTRY: CountryCode = 'BO';

@Injectable({ providedIn: 'root' })
export class ClinicCountryService {
  private readonly regionalSettings = inject(ClinicRegionalSettingsStore);
  private readonly guestSession = inject(GuestSessionService);
  private readonly regions = inject(RegionsStore);

  readonly country = computed<CountryCode>(
    () =>
      this.guestSession.country() ?? this.regionalSettings.settings()?.country ?? DEFAULT_COUNTRY,
  );
  readonly phonePlaceholder = computed(
    () => this.regions.country(this.country())?.phonePlaceholder ?? '',
  );
}
