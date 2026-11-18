import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';

import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { ClinicRegionalSettingsStore } from '../../../../app/core/clinic/clinic-regional-settings.store';
import { ClinicRegionalSettings } from '../../../../app/core/models/api.models';

const FROM_CLAIMS: ClinicRegionalSettings = {
  country: 'BO',
  timezone: 'America/La_Paz',
  defaultLanguage: 'es',
};
const FROM_SERVER: ClinicRegionalSettings = {
  country: 'BR',
  timezone: 'America/Sao_Paulo',
  defaultLanguage: 'pt-BR',
};

describe('ClinicRegionalSettingsStore', () => {
  async function settle(): Promise<void> {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  let store: ClinicRegionalSettingsStore;
  let http: HttpTestingController;
  const replaceToken = vi.fn();
  let claims: ReturnType<typeof signal<ClinicRegionalSettings | null>>;

  beforeEach(() => {
    replaceToken.mockClear();
    claims = signal<ClinicRegionalSettings | null>(FROM_CLAIMS);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { regionalSettings: claims, session: signal({ clinicId: 1 }), replaceToken },
        },
      ],
    });
    store = TestBed.inject(ClinicRegionalSettingsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('seeds the settings from the session claims without any request', async () => {
    TestBed.tick();

    expect(replaceToken).not.toHaveBeenCalled();
    expect(store.settings()).toEqual(FROM_CLAIMS);
    http.expectNone('clinic/regional-settings');
  });

  it('is null when the session has no regional claims', async () => {
    claims.set(null);

    expect(store.settings()).toBeNull();
  });

  it('load() replaces the seed with the GET response', async () => {
    store.load();
    TestBed.tick();
    const req = http.expectOne('clinic/regional-settings');
    expect(req.request.method).toBe('GET');
    req.flush(FROM_SERVER);
    await settle();

    expect(store.settings()).toEqual(FROM_SERVER);
    expect(store.hasError()).toBe(false);
  });

  it('update() sends PUT and stores the response as the new value', async () => {
    let result: ClinicRegionalSettings | undefined;

    store.update(FROM_SERVER).subscribe((value) => (result = value));
    const req = http.expectOne('clinic/regional-settings');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(FROM_SERVER);
    req.flush({ settings: { ...FROM_SERVER, timezone: 'America/Manaus' }, token: 'new-jwt' });

    expect(result?.timezone).toBe('America/Manaus');
    expect(store.settings()).toEqual({ ...FROM_SERVER, timezone: 'America/Manaus' });
  });

  it('update() replaces the session token with the one returned by the server', () => {
    store.update(FROM_SERVER).subscribe();
    http.expectOne('clinic/regional-settings').flush({ settings: FROM_SERVER, token: 'new-jwt' });

    expect(replaceToken).toHaveBeenCalledExactlyOnceWith('new-jwt');
  });

  it('keeps the previous value when update() fails', async () => {
    let failed = false;

    store.update(FROM_SERVER).subscribe({ error: () => (failed = true) });
    http
      .expectOne('clinic/regional-settings')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(failed).toBe(true);
    expect(replaceToken).not.toHaveBeenCalled();
    expect(store.settings()).toEqual(FROM_CLAIMS);
  });

  it('exposes the load error and load() retries after it', async () => {
    store.load();
    TestBed.tick();
    http
      .expectOne('clinic/regional-settings')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(store.hasError()).toBe(true);
    expect(replaceToken).not.toHaveBeenCalled();
    expect(store.settings()).toEqual(FROM_CLAIMS);

    store.load();
    TestBed.tick();
    http.expectOne('clinic/regional-settings').flush(FROM_SERVER);
    await settle();

    expect(store.hasError()).toBe(false);
    expect(store.settings()).toEqual(FROM_SERVER);
  });
});
