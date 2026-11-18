import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClinicSettingsApi } from '../../../../app/core/api/clinic-settings.api';
import { ClinicRegionalSettings } from '../../../../app/core/models/api.models';

const SETTINGS: ClinicRegionalSettings = {
  country: 'BR',
  timezone: 'America/Sao_Paulo',
  defaultLanguage: 'pt-BR',
};

describe('ClinicSettingsApi', () => {
  let api: ClinicSettingsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ClinicSettingsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the settings with GET clinic/regional-settings', () => {
    let result: ClinicRegionalSettings | undefined;

    api.regionalSettings().subscribe((value) => (result = value));
    const req = http.expectOne('clinic/regional-settings');
    expect(req.request.method).toBe('GET');
    req.flush(SETTINGS);

    expect(result).toEqual(SETTINGS);
  });

  it('updates the settings with PUT clinic/regional-settings and the request body', () => {
    let completed = false;

    api.updateRegionalSettings(SETTINGS).subscribe({ complete: () => (completed = true) });
    const req = http.expectOne('clinic/regional-settings');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(SETTINGS);
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });
});
