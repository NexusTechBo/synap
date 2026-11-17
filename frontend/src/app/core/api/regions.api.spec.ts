import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RegionCatalog } from '../models/api.models';
import { RegionsApi } from './regions.api';

describe('RegionsApi', () => {
  let api: RegionsApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(RegionsApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the catalog with GET regions and returns it', () => {
    const catalog: RegionCatalog = { countries: [], languages: ['es', 'en'] };
    let result: RegionCatalog | undefined;

    api.catalog().subscribe((value) => (result = value));
    const req = http.expectOne('regions');
    expect(req.request.method).toBe('GET');
    req.flush(catalog);

    expect(result).toEqual(catalog);
  });
});
