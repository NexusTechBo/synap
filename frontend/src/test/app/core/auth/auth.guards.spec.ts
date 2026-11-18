import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { authGuard, guestGuard, roleGuard } from '../../../../app/core/auth/auth.guards';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { Role } from '../../../../app/core/models/api.models';

describe('auth guards', () => {
  let authenticated: boolean;
  let restorable: boolean;
  let roles: Role[];
  const ensureSession = vi.fn(() => of(restorable));

  beforeEach(() => {
    authenticated = false;
    restorable = false;
    roles = [];
    ensureSession.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => authenticated,
            ensureSession,
            hasRole: (...wanted: Role[]) => wanted.some((role) => roles.includes(role)),
          },
        },
      ],
    });
  });

  function outcome(result: unknown): true | string {
    if (result === true) return true;
    if (result instanceof UrlTree) return result.toString();
    throw new Error(`Unexpected guard result: ${String(result)}`);
  }

  async function run(guard: CanActivateFn): Promise<true | string> {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return outcome(result instanceof Observable ? await firstValueFrom(result) : result);
  }

  describe('authGuard', () => {
    it('allows an authenticated user without trying to restore', async () => {
      authenticated = true;
      expect(await run(authGuard)).toBe(true);
      expect(ensureSession).not.toHaveBeenCalled();
    });

    it('redirects an anonymous user to the login when the session cannot be restored', async () => {
      expect(await run(authGuard)).toBe('/login');
      expect(ensureSession).toHaveBeenCalledOnce();
    });

    it('allows the user when the session is restored by a refresh', async () => {
      restorable = true;
      expect(await run(authGuard)).toBe(true);
    });
  });

  describe('guestGuard', () => {
    it('allows an anonymous user whose session cannot be restored', async () => {
      expect(await run(guestGuard)).toBe(true);
    });

    it('redirects an authenticated user to the dashboard', async () => {
      authenticated = true;
      expect(await run(guestGuard)).toBe('/dashboard');
      expect(ensureSession).not.toHaveBeenCalled();
    });

    it('redirects to the dashboard when the session is restored by a refresh', async () => {
      restorable = true;
      expect(await run(guestGuard)).toBe('/dashboard');
    });
  });

  describe('roleGuard', () => {
    it('allows a user with one of the roles', async () => {
      authenticated = true;
      roles = ['DOCTOR'];
      expect(await run(roleGuard('ADMINISTRATOR', 'DOCTOR'))).toBe(true);
    });

    it('allows an administrator that is also a doctor on a doctor page', async () => {
      authenticated = true;
      roles = ['ADMINISTRATOR', 'DOCTOR'];
      expect(await run(roleGuard('DOCTOR'))).toBe(true);
    });

    it('redirects a user without the role to the dashboard', async () => {
      authenticated = true;
      roles = ['ASSISTANT'];
      expect(await run(roleGuard('ADMINISTRATOR'))).toBe('/dashboard');
    });

    it('waits for the session restoration before checking the role', async () => {
      restorable = true;
      ensureSession.mockImplementationOnce(() => {
        roles = ['ADMINISTRATOR'];
        return of(true);
      });
      expect(await run(roleGuard('ADMINISTRATOR'))).toBe(true);
    });
  });
});
