import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RegionsStore } from '../../../../app/core/clinic/regions.store';
import { RegionCatalog } from '../../../../app/core/models/api.models';

const CATALOG: RegionCatalog = {
  countries: [
    {
      code: 'BO',
      defaultTimezone: 'America/La_Paz',
      timezones: ['America/La_Paz'],
      defaultLanguage: 'es',
      phonePlaceholder: '+591 70000000',
    },
    {
      code: 'BR',
      defaultTimezone: 'America/Sao_Paulo',
      timezones: ['America/Sao_Paulo', 'America/Manaus'],
      defaultLanguage: 'pt-BR',
      phonePlaceholder: '+55 11 91234-5678',
    },
  ],
  languages: ['es', 'en', 'pt-BR'],
};

describe('RegionsStore', () => {
  async function settle(): Promise<void> {
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  let store: RegionsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(RegionsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('is empty and unavailable before the catalog arrives', async () => {
    TestBed.tick();

    expect(store.countries()).toEqual([]);
    expect(store.available()).toBe(false);
    expect(store.isLoading()).toBe(true);
    http.expectOne('regions');
  });

  it('exposes countries, languages and lookup once loaded', async () => {
    TestBed.tick();
    http.expectOne('regions').flush(CATALOG);
    await settle();

    expect(store.countries()).toEqual(CATALOG.countries);
    expect(store.languages()).toEqual(CATALOG.languages);
    expect(store.available()).toBe(true);
    expect(store.country('BR')?.defaultTimezone).toBe('America/Sao_Paulo');
    expect(store.country('XX')).toBeUndefined();
    expect(store.country(null)).toBeUndefined();
    expect(store.hasError()).toBe(false);
  });

  it('requests the catalog once even if read many times', async () => {
    TestBed.tick();
    store.countries();
    store.languages();
    store.available();
    TestBed.tick();
    const second = TestBed.inject(RegionsStore);

    http.expectOne('regions').flush(CATALOG);
    await settle();
    second.countries();
    TestBed.tick();

    expect(second).toBe(store);
    http.expectNone('regions');
  });

  it('flags the load error and stays unavailable on failure', async () => {
    TestBed.tick();
    http.expectOne('regions').flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    expect(store.hasError()).toBe(true);
    expect(store.available()).toBe(false);
  });

  it('reload() issues a new request that can recover from an error', async () => {
    TestBed.tick();
    http.expectOne('regions').flush(null, { status: 500, statusText: 'Server Error' });
    await settle();

    store.reload();
    TestBed.tick();
    http.expectOne('regions').flush(CATALOG);
    await settle();

    expect(store.hasError()).toBe(false);
    expect(store.available()).toBe(true);
  });
});
