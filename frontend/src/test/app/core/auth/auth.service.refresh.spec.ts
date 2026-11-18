import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../app/core/auth/auth.service';

const TOKEN_KEY = 'scheduler.token';
const NOW = new Date('2026-01-01T00:00:00Z');

function b64(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function token(lifetimeSeconds: number, userId = '5'): string {
  const payload = {
    sub: userId,
    roles: ['ADMINISTRATOR'],
    clinicId: 1,
    clinicName: 'Clínica',
    clinicSlug: 'clinica',
    username: 'admin',
    exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
  };
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.${userId}-${lifetimeSeconds}`;
}

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function setLocks(locks: unknown): void {
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
}

describe('AuthService refresh', () => {
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;

  function createService(stored: string | null): AuthService {
    localStorage.clear();
    if (stored) localStorage.setItem(TOKEN_KEY, stored);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true) as never;
    return TestBed.inject(AuthService);
  }

  async function expectRefreshRequest() {
    await settle();
    return http.expectOne('auth/refresh');
  }

  beforeEach(() => setLocks(undefined));

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe('refresh()', () => {
    it('shares a single POST between concurrent refreshes', async () => {
      const auth = createService(token(3600));
      const fresh = token(7200);

      const first = firstValueFrom(auth.refresh());
      const second = firstValueFrom(auth.refresh());
      (await expectRefreshRequest()).flush({ token: fresh });

      expect((await first).token).toBe(fresh);
      expect((await second).token).toBe(fresh);
      expect(auth.token()).toBe(fresh);
      expect(localStorage.getItem(TOKEN_KEY)).toBe(fresh);
    });

    it('sends a new POST once the previous refresh finished', async () => {
      const auth = createService(token(3600));

      const first = firstValueFrom(auth.refresh());
      (await expectRefreshRequest()).flush({ token: token(7200) });
      await first;
      const second = firstValueFrom(auth.refresh());
      (await expectRefreshRequest()).flush({ token: token(9000) });

      expect((await second).token).toBe(auth.token());
    });

    it('uses a fresh token stored by another tab without any POST', async () => {
      const auth = createService(token(3600));
      const other = token(7200);
      localStorage.setItem(TOKEN_KEY, other);

      const session = await firstValueFrom(auth.refresh());

      expect(session.token).toBe(other);
      expect(auth.token()).toBe(other);
      http.expectNone('auth/refresh');
    });

    it('still posts when the stored token is the stale one', async () => {
      const stale = token(3600);
      const auth = createService(stale);

      const result = firstValueFrom(auth.refresh(stale));
      (await expectRefreshRequest()).flush({ token: token(7200) });

      expect((await result).token).not.toBe(stale);
    });

    it('still posts when the other tab token is about to expire', async () => {
      const auth = createService(token(3600));
      localStorage.setItem(TOKEN_KEY, token(30));

      const result = firstValueFrom(auth.refresh());
      (await expectRefreshRequest()).flush({ token: token(7200) });

      expect((await result).token).toBe(auth.token());
    });

    it('closes the session once when the refresh is rejected with 401', async () => {
      const auth = createService(token(3600));

      const first = firstValueFrom(auth.refresh()).catch((error: unknown) => error);
      const second = firstValueFrom(auth.refresh()).catch((error: unknown) => error);
      (await expectRefreshRequest()).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(((await first) as HttpErrorResponse).status).toBe(401);
      expect(((await second) as HttpErrorResponse).status).toBe(401);
      expect(auth.session()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(navigate).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(['/login'], {});
    });

    it.each([500, 503, 0])('keeps the session when the refresh fails with %s', async (status) => {
      const stored = token(3600);
      const auth = createService(stored);

      const result = firstValueFrom(auth.refresh()).catch((error: unknown) => error);
      (await expectRefreshRequest()).flush(null, { status, statusText: 'Error' });

      expect(((await result) as HttpErrorResponse).status).toBe(status);
      expect(auth.token()).toBe(stored);
      expect(localStorage.getItem(TOKEN_KEY)).toBe(stored);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('runs the refresh inside the navigator lock when it exists', async () => {
      const request = vi.fn((_name: string, task: () => Promise<unknown>) => task());
      setLocks({ request });
      const auth = createService(token(3600));

      const result = firstValueFrom(auth.refresh());
      (await expectRefreshRequest()).flush({ token: token(7200) });
      await result;

      expect(request).toHaveBeenCalledOnce();
      expect(request.mock.calls[0][0]).toBe('scheduler.auth-refresh');
    });

    it('requests the lock only once for concurrent refreshes', async () => {
      const request = vi.fn((_name: string, task: () => Promise<unknown>) => task());
      setLocks({ request });
      const auth = createService(token(3600));

      const first = firstValueFrom(auth.refresh());
      const second = firstValueFrom(auth.refresh());
      (await expectRefreshRequest()).flush({ token: token(7200) });
      await Promise.all([first, second]);

      expect(request).toHaveBeenCalledOnce();
    });
  });

  describe('ensureSession()', () => {
    it('returns true without a request when the session is valid', async () => {
      const auth = createService(token(3600));

      expect(await firstValueFrom(auth.ensureSession())).toBe(true);
      http.expectNone('auth/refresh');
    });

    it('tries a single refresh for an anonymous startup and then stops asking', async () => {
      const auth = createService(null);

      const first = firstValueFrom(auth.ensureSession());
      (await expectRefreshRequest()).flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(await first).toBe(false);

      expect(await firstValueFrom(auth.ensureSession())).toBe(false);
      await settle();
      http.expectNone('auth/refresh');
    });

    it('restores the session from the cookie when the stored token is expired', async () => {
      const auth = createService(token(-60));
      expect(auth.session()).toBeNull();
      const fresh = token(3600);

      const result = firstValueFrom(auth.ensureSession());
      (await expectRefreshRequest()).flush({ token: fresh });

      expect(await result).toBe(true);
      expect(auth.session()?.token).toBe(fresh);
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('clears the stored token and returns false when the refresh is rejected', async () => {
      const auth = createService(token(-60));

      const result = firstValueFrom(auth.ensureSession());
      (await expectRefreshRequest()).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(await result).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('returns false and keeps the stored token when the refresh fails with a 5xx', async () => {
      const expired = token(-60);
      const auth = createService(expired);

      const result = firstValueFrom(auth.ensureSession());
      (await expectRefreshRequest()).flush(null, { status: 503, statusText: 'Unavailable' });

      expect(await result).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBe(expired);
    });

    it('retries when a stored token is still present after the startup attempt', async () => {
      const auth = createService(null);
      const first = firstValueFrom(auth.ensureSession());
      (await expectRefreshRequest()).flush(null, { status: 401, statusText: 'Unauthorized' });
      await first;
      localStorage.setItem(TOKEN_KEY, token(-60));

      const second = firstValueFrom(auth.ensureSession());
      (await expectRefreshRequest()).flush({ token: token(3600) });

      expect(await second).toBe(true);
    });
  });

  describe('proactive renewal', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    async function advance(ms: number): Promise<void> {
      await vi.advanceTimersByTimeAsync(ms);
      await settle();
    }

    it('refreshes 60 seconds before the token expires', async () => {
      createService(token(120));

      await advance(59_999);
      http.expectNone('auth/refresh');
      await advance(1);

      http.expectOne('auth/refresh').flush({ token: token(3600) });
    });

    it('schedules the next renewal from the new token', async () => {
      const auth = createService(token(120));
      await advance(60_000);
      http.expectOne('auth/refresh').flush({ token: token(3600) });
      await settle();

      await advance(3_539_999);
      http.expectNone('auth/refresh');
      await advance(1);

      http.expectOne('auth/refresh').flush({ token: token(7200) });
      await settle();
      expect(auth.token()).not.toBeNull();
    });

    it('never schedules sooner than 5 seconds', async () => {
      createService(token(10));

      await advance(4_999);
      http.expectNone('auth/refresh');
      await advance(1);

      http.expectOne('auth/refresh').flush({ token: token(3600) });
    });

    it('backs off 5, 15 and 30 seconds after network or 5xx failures', async () => {
      const auth = createService(token(3600));
      await advance(3_540_000);

      http.expectOne('auth/refresh').flush(null, { status: 503, statusText: 'Unavailable' });
      await settle();
      await advance(4_999);
      http.expectNone('auth/refresh');
      await advance(1);

      http.expectOne('auth/refresh').flush(null, { status: 0, statusText: 'Unknown' });
      await settle();
      await advance(14_999);
      http.expectNone('auth/refresh');
      await advance(1);

      http.expectOne('auth/refresh').flush(null, { status: 500, statusText: 'Error' });
      await settle();
      await advance(29_999);
      http.expectNone('auth/refresh');
      await advance(1);

      http.expectOne('auth/refresh').flush({ token: token(7200) });
      await settle();
      expect(auth.token()).not.toBeNull();
    });

    it('does not retry after the token has already expired', async () => {
      createService(token(65));
      await advance(5_000);
      http.expectOne('auth/refresh').flush(null, { status: 503, statusText: 'Unavailable' });
      await settle();

      await advance(60_000);
      http.expectOne('auth/refresh').flush(null, { status: 503, statusText: 'Unavailable' });
      await settle();

      await advance(120_000);
      http.expectNone('auth/refresh');
    });

    it('does not retry and closes the session when the renewal gets a 401', async () => {
      const auth = createService(token(120));
      await advance(60_000);

      http.expectOne('auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
      await settle();
      await advance(120_000);

      http.expectNone('auth/refresh');
      expect(auth.session()).toBeNull();
      expect(navigate).toHaveBeenCalledOnce();
    });

    it('does not renew after the session was closed', async () => {
      const auth = createService(token(120));
      auth.expireSession(auth.token() as string);

      await advance(120_000);

      http.expectNone('auth/refresh');
    });
  });

  describe('logout()', () => {
    it('posts auth/logout, clears the session and navigates to the login', () => {
      const auth = createService(token(3600));

      auth.logout();

      http.expectOne('auth/logout').flush(null, { status: 204, statusText: 'No Content' });
      expect(auth.session()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(navigate).toHaveBeenCalledOnce();
      expect(navigate).toHaveBeenCalledWith(['/login'], {});
    });

    it('navigates immediately and tolerates a failing logout request', () => {
      const auth = createService(token(3600));

      auth.logout({ queryParams: { reason: 'expired' } });
      expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'expired' } });
      http.expectOne('auth/logout').flush(null, { status: 500, statusText: 'Error' });

      expect(auth.session()).toBeNull();
    });
  });

  describe('refresh and logout race', () => {
    it('does not store the token of a refresh that resolves after logout', async () => {
      const auth = createService(token(3600));
      const outcome = auth.refresh().subscribe({ error: () => undefined });
      const refreshRequest = await expectRefreshRequest();

      auth.logout();
      http.expectOne('auth/logout').flush(null, { status: 204, statusText: 'No Content' });
      refreshRequest.flush({ token: token(3600, '9') });
      await settle();
      outcome.unsubscribe();

      expect(auth.session()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(navigate).toHaveBeenCalledOnce();
    });

    it('rejects the late refresh without closing the session again', async () => {
      const auth = createService(token(3600));
      let failure: unknown;
      auth.refresh().subscribe({ error: (error) => (failure = error) });
      const refreshRequest = await expectRefreshRequest();

      auth.logout();
      http.expectOne('auth/logout').flush(null, { status: 204, statusText: 'No Content' });
      refreshRequest.flush({ token: token(3600) });
      await vi.waitFor(() => expect(failure).toBeInstanceOf(Error));

      expect(navigate).toHaveBeenCalledOnce();
    });

    it('does not reuse the refresh in flight before the logout', async () => {
      const auth = createService(token(3600));
      auth.refresh().subscribe({ error: () => undefined });
      await expectRefreshRequest();

      auth.logout();
      http.expectOne('auth/logout').flush(null, { status: 204, statusText: 'No Content' });
      auth.refresh(null).subscribe({ error: () => undefined });
      await settle();

      expect(http.match('auth/refresh')).toHaveLength(1);
    });
  });
});
