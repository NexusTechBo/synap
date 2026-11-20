import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { GuestSessionService } from '../../../../app/core/auth/guest-session.service';
import {
  apiUrlInterceptor,
  authInterceptor,
  languageInterceptor,
} from '../../../../app/core/http/api.interceptors';

describe('API interceptors', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: {
    token: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    expireSession: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  };
  let guest: {
    ensureToken: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    fail: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = {
      token: vi.fn(() => 'staff-token'),
      isAuthenticated: vi.fn(() => true),
      expireSession: vi.fn(),
      refresh: vi.fn(() => of({ token: 'new-token' })),
    };
    guest = {
      ensureToken: vi.fn(() => of('guest-token')),
      clear: vi.fn(),
      fail: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiUrlInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: GuestSessionService, useValue: guest },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  function captureError(): { error?: HttpErrorResponse } {
    return {};
  }

  describe('apiUrlInterceptor', () => {
    it('prefixes relative URLs with the API base URL', () => {
      http.get('patients').subscribe();
      controller.expectOne('/api/patients').flush([]);
    });

    it.each(['/ws/info', 'https://example.test/a', '//cdn.test/b'])('keeps %s untouched', (url) => {
      http.get(url).subscribe();
      controller.expectOne(url).flush({});
    });
  });

  describe('authInterceptor for staff requests', () => {
    it('adds the bearer token', () => {
      http.get('patients').subscribe();
      const req = controller.expectOne('/api/patients');
      expect(req.request.headers.get('Authorization')).toBe('Bearer staff-token');
      req.flush([]);
    });

    it('sends no Authorization header without a session', () => {
      auth.token.mockReturnValue(null);
      http.get('patients').subscribe();
      const req = controller.expectOne('/api/patients');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    });

    it.each([
      ['POST', 'auth/login'],
      ['POST', 'public/guest/session'],
      ['POST', 'clinics/activate'],
      ['POST', 'clinics/activation/resend'],
      ['POST', 'clinics'],
    ])('never sends the token to the public endpoint %s %s', (method, url) => {
      http.request(method, url, { body: {} }).subscribe();
      const req = controller.expectOne(`/api/${url}`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('sends the token to non public clinic endpoints', () => {
      http.get('clinics').subscribe();
      const req = controller.expectOne('/api/clinics');
      expect(req.request.headers.get('Authorization')).toBe('Bearer staff-token');
      req.flush({});
    });

    it('refreshes and sends the request with the new token when the token is expired', () => {
      auth.isAuthenticated.mockReturnValue(false);
      let body: unknown;

      http.get('patients').subscribe((b) => (body = b));

      const req = controller.expectOne('/api/patients');
      expect(auth.refresh).toHaveBeenCalledWith('staff-token');
      expect(req.request.headers.get('Authorization')).toBe('Bearer new-token');
      req.flush({ ok: true });
      expect(body).toEqual({ ok: true });
    });

    it('fails without sending when the token is expired and the refresh fails', () => {
      auth.isAuthenticated.mockReturnValue(false);
      const refreshError = new HttpErrorResponse({ status: 401 });
      auth.refresh.mockReturnValue(throwError(() => refreshError));
      const outcome = captureError();

      http.get('patients').subscribe({ error: (e) => (outcome.error = e) });

      controller.expectNone('/api/patients');
      expect(outcome.error).toBe(refreshError);
    });

    it('refreshes and retries once with the new token after a 401', () => {
      let body: unknown;
      http.get('patients').subscribe((b) => (body = b));

      controller
        .expectOne('/api/patients')
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      const retry = controller.expectOne('/api/patients');

      expect(auth.refresh).toHaveBeenCalledWith('staff-token');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-token');
      retry.flush({ ok: true });
      expect(body).toEqual({ ok: true });
      expect(auth.expireSession).not.toHaveBeenCalled();
    });

    it('fails with the original 401 when the refresh fails', () => {
      auth.refresh.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
      const outcome = captureError();
      http.get('patients').subscribe({ error: (e) => (outcome.error = e) });

      controller
        .expectOne('/api/patients')
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      controller.expectNone('/api/patients');
      expect(outcome.error?.status).toBe(401);
    });

    it('expires the session when the retried request gets a 401 again', () => {
      const outcome = captureError();
      http.get('patients').subscribe({ error: (e) => (outcome.error = e) });

      controller
        .expectOne('/api/patients')
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      controller
        .expectOne('/api/patients')
        .flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(auth.refresh).toHaveBeenCalledOnce();
      expect(auth.expireSession).toHaveBeenCalledWith('new-token');
      expect(outcome.error?.status).toBe(401);
    });

    it('does not attach the token nor retry on auth/refresh and auth/logout', () => {
      for (const path of ['auth/refresh', 'auth/logout']) {
        http.post(path, null).subscribe({ error: () => undefined });
        const req = controller.expectOne(`/api/${path}`);
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush(null, { status: 401, statusText: 'Unauthorized' });
      }
      expect(auth.refresh).not.toHaveBeenCalled();
    });

    it('keeps the session on other errors', () => {
      http.get('patients').subscribe({ error: () => undefined });
      controller.expectOne('/api/patients').flush(null, { status: 403, statusText: 'Forbidden' });
      expect(auth.expireSession).not.toHaveBeenCalled();
    });

    it('does not expire anything on a 401 without token', () => {
      auth.token.mockReturnValue(null);
      http.get('patients').subscribe({ error: () => undefined });
      controller
        .expectOne('/api/patients')
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(auth.expireSession).not.toHaveBeenCalled();
    });
  });

  describe('authInterceptor for guest requests', () => {
    it('sends the guest token instead of the staff token', () => {
      http.get('guest/clinic').subscribe();
      const req = controller.expectOne('/api/guest/clinic');
      expect(req.request.headers.get('Authorization')).toBe('Bearer guest-token');
      expect(auth.token).not.toHaveBeenCalled();
      req.flush({});
    });

    it('renews the guest token and retries once after a 401', () => {
      guest.ensureToken.mockReturnValueOnce(of('old-token')).mockReturnValueOnce(of('new-token'));
      let body: unknown;
      http.get('guest/clinic').subscribe((b) => (body = b));

      controller
        .expectOne((r) => r.headers.get('Authorization') === 'Bearer old-token')
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(guest.clear).toHaveBeenCalledOnce();
      controller
        .expectOne((r) => r.headers.get('Authorization') === 'Bearer new-token')
        .flush({ name: 'Clínica' });

      expect(body).toEqual({ name: 'Clínica' });
      expect(guest.fail).not.toHaveBeenCalled();
    });

    it('marks the guest session as failed when the retry also gets a 401', () => {
      const outcome = captureError();
      http.get('guest/clinic').subscribe({ error: (e) => (outcome.error = e) });

      controller.expectOne('/api/guest/clinic').flush(null, { status: 401, statusText: 'No' });
      controller.expectOne('/api/guest/clinic').flush(null, { status: 401, statusText: 'No' });

      expect(guest.fail).toHaveBeenCalledWith(outcome.error);
      expect(outcome.error?.status).toBe(401);
    });

    it('passes other guest errors through without retrying', () => {
      const outcome = captureError();
      http.get('guest/clinic').subscribe({ error: (e) => (outcome.error = e) });

      controller
        .expectOne('/api/guest/clinic')
        .flush(null, { status: 409, statusText: 'Conflict' });

      expect(guest.clear).not.toHaveBeenCalled();
      expect(outcome.error?.status).toBe(409);
    });

    it('fails without a request when no guest token can be obtained', () => {
      const failure = new HttpErrorResponse({ status: 404 });
      guest.ensureToken.mockReturnValue(throwError(() => failure));
      const outcome = captureError();

      http.get('guest/clinic').subscribe({ error: (e) => (outcome.error = e) });

      controller.expectNone('/api/guest/clinic');
      expect(outcome.error).toBe(failure);
    });
  });
});

describe('languageInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  function setup(browserLanguage: string): void {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browserLanguage);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiUrlInterceptor, languageInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    controller.verify();
    vi.restoreAllMocks();
  });

  it.each([
    ['en-US', 'en'],
    ['pt-BR', 'pt-BR'],
    ['es-BO', 'es'],
    ['es', 'es'],
  ])('sends Accept-Language for browser %s as %s', (browserLanguage, expected) => {
    setup(browserLanguage);

    http.get('patients').subscribe();

    const req = controller.expectOne('/api/patients');
    expect(req.request.headers.get('Accept-Language')).toBe(expected);
    req.flush([]);
  });

  it.each(['/ws/info', 'https://example.test/a', '//cdn.test/b'])(
    'does not send Accept-Language to %s',
    (url) => {
      setup('en-US');

      http.get(url).subscribe();

      const req = controller.expectOne(url);
      expect(req.request.headers.has('Accept-Language')).toBe(false);
      req.flush({});
    },
  );
});
