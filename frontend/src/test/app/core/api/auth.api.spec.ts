import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthApi } from '../../../../app/core/api/auth.api';

describe('AuthApi', () => {
  let api: AuthApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuthApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('refreshes the session with an empty POST auth/refresh', () => {
    let token: string | undefined;

    api.refresh().subscribe((response) => (token = response.token));
    const req = http.expectOne('auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ token: 'fresh' });

    expect(token).toBe('fresh');
  });

  it('logs out with an empty POST auth/logout', () => {
    let completed = false;

    api.logout().subscribe({ complete: () => (completed = true) });
    const req = http.expectOne('auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(completed).toBe(true);
  });
});
