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

  describe('transient failures', () => {
    beforeEach(() => vi.useFakeTimers());

    afterEach(() => vi.useRealTimers());

    async function elapse(ms: number): Promise<void> {
      await vi.advanceTimersByTimeAsync(ms);
      TestBed.tick();
    }

    it.each([0, 502, 503, 504])('retries on status %i and recovers', async (status) => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status, statusText: 'Transient' });
      await elapse(0);

      expect(store.isLoading()).toBe(true);
      expect(store.hasError()).toBe(false);

      await elapse(1_000);
      http.expectOne('regions').flush(CATALOG);
      await elapse(0);

      expect(store.available()).toBe(true);
      expect(store.hasError()).toBe(false);
      expect(store.isLoading()).toBe(false);
    });

    it('backs off exponentially up to the maximum delay', async () => {
      TestBed.tick();
      const delays = [1_000, 2_000, 4_000, 5_000, 5_000];
      http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });

      for (const delay of delays) {
        await elapse(delay - 1);
        http.expectNone('regions');
        await elapse(1);
        http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });
      }
      await elapse(0);

      expect(store.isLoading()).toBe(true);
    });

    it('flags the error once the retries are exhausted', async () => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });

      for (let attempt = 0; attempt < 7; attempt++) {
        await elapse(5_000);
        http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });
      }
      await elapse(5_000);
      http.expectNone('regions');

      expect(store.hasError()).toBe(true);
      expect(store.isLoading()).toBe(false);
      expect(store.available()).toBe(false);
    });

    it('is not retrying initially', () => {
      TestBed.tick();

      expect(store.retrying()).toBe(false);
      http.expectOne('regions');
    });

    it('is retrying after a transient failure and stops once the catalog loads', async () => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });
      await elapse(0);

      expect(store.retrying()).toBe(true);

      await elapse(1_000);
      http.expectOne('regions').flush(CATALOG);
      await elapse(0);

      expect(store.retrying()).toBe(false);
    });

    it('stops retrying when the attempts are exhausted', async () => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });
      for (let attempt = 0; attempt < 7; attempt++) {
        await elapse(5_000);
        http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });
      }
      await elapse(0);

      expect(store.hasError()).toBe(true);
      expect(store.retrying()).toBe(false);
    });

    it('keeps retrying state when reload is ignored while a retry is pending', async () => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });
      await elapse(0);

      store.reload();
      await elapse(0);

      expect(store.retrying()).toBe(true);
      http.expectNone('regions');
    });

    it('is not retrying after reload from the error state', async () => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status: 400, statusText: 'Bad Request' });
      await elapse(0);

      store.reload();
      await elapse(0);

      expect(store.retrying()).toBe(false);
      expect(store.isLoading()).toBe(true);
      http.expectOne('regions');
    });

    it('stops retrying when the stream is cancelled by destroying the store', async () => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status: 502, statusText: 'Bad Gateway' });
      await elapse(0);
      expect(store.retrying()).toBe(true);

      TestBed.resetTestingModule();
      await vi.advanceTimersByTimeAsync(0);

      expect(store.retrying()).toBe(false);
    });

    it('does not mark a non transient failure as retrying', async () => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status: 400, statusText: 'Bad Request' });
      await elapse(0);

      expect(store.retrying()).toBe(false);
    });

    it.each([400, 404, 500])('does not retry on status %i', async (status) => {
      TestBed.tick();
      http.expectOne('regions').flush(null, { status, statusText: 'Failure' });
      await elapse(10_000);

      http.expectNone('regions');
      expect(store.hasError()).toBe(true);
    });
  });
});
