import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ClinicRegionalSettings } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ClinicSettingsApi {
  private readonly http = inject(HttpClient);

  regionalSettings(): Observable<ClinicRegionalSettings> {
    return this.http.get<ClinicRegionalSettings>('clinic/regional-settings');
  }

  updateRegionalSettings(request: ClinicRegionalSettings): Observable<void> {
    return this.http.put<void>('clinic/regional-settings', request);
  }
}
