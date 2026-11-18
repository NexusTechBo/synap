import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../app/core/auth/auth.service';

const TOKEN_KEY = 'scheduler.token';

function b64(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function token(extra: Record<string, unknown> = {}): string {
  const payload = {
    sub: '5',
    roles: ['ADMINISTRATOR'],
    clinicId: 1,
    clinicName: 'Clínica',
    clinicSlug: 'clinica',
    username: 'admin',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
  };
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`;
}

function createService(jwt: string | null): AuthService {
  localStorage.clear();
  if (jwt) localStorage.setItem(TOKEN_KEY, jwt);
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  return TestBed.inject(AuthService);
}

describe('AuthService regional claims', () => {
  afterEach(() => localStorage.clear());

  it('decodes country, timezone and defaultLanguage into the session', () => {
    const auth = createService(
      token({ country: 'BR', timezone: 'America/Sao_Paulo', defaultLanguage: 'pt-BR' }),
    );

    expect(auth.session()).toEqual(
      expect.objectContaining({
        country: 'BR',
        timezone: 'America/Sao_Paulo',
        defaultLanguage: 'pt-BR',
      }),
    );
    expect(auth.regionalSettings()).toEqual({
      country: 'BR',
      timezone: 'America/Sao_Paulo',
      defaultLanguage: 'pt-BR',
    });
  });

  it('returns null regional settings for a token without the new claims', () => {
    const auth = createService(token());

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.regionalSettings()).toBeNull();
  });

  it('returns null when any claim is missing', () => {
    const auth = createService(token({ country: 'BO', timezone: 'America/La_Paz' }));

    expect(auth.regionalSettings()).toBeNull();
  });

  it('returns null without a session', () => {
    const auth = createService(null);

    expect(auth.regionalSettings()).toBeNull();
  });

  it('updates regional settings when the token is replaced', () => {
    const auth = createService(token());

    auth.replaceToken(token({ country: 'BO', timezone: 'America/La_Paz', defaultLanguage: 'es' }));

    expect(auth.regionalSettings()).toEqual({
      country: 'BO',
      timezone: 'America/La_Paz',
      defaultLanguage: 'es',
    });
  });

  describe('roles claim', () => {
    it('has no session when roles is missing', () => {
      const auth = createService(token({ roles: undefined }));

      expect(auth.session()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('has no session when roles is empty', () => {
      const auth = createService(token({ roles: [] }));

      expect(auth.session()).toBeNull();
    });

    it('has no staff session for a guest-only token', () => {
      const auth = createService(token({ roles: ['GUEST'] }));

      expect(auth.session()).toBeNull();
      expect(auth.hasRole('ADMINISTRATOR', 'DOCTOR', 'ASSISTANT')).toBe(false);
    });

    it('discards unknown roles and keeps the valid ones', () => {
      const auth = createService(token({ roles: ['DOCTOR', 'FOO'] }));

      expect(auth.roles()).toEqual(['DOCTOR']);
    });

    it('keeps every valid role of a multi-role token', () => {
      const auth = createService(token({ roles: ['ADMINISTRATOR', 'DOCTOR'] }));

      expect(auth.roles()).toEqual(['ADMINISTRATOR', 'DOCTOR']);
    });

    it('has no session when username is missing', () => {
      const auth = createService(token({ username: undefined }));

      expect(auth.session()).toBeNull();
    });

    it('does not restore a session from a legacy token with only role', () => {
      const auth = createService(token({ roles: undefined, role: 'ADMINISTRATOR' }));

      expect(auth.session()).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });

    it('removes a rejected stored token', () => {
      createService(token({ roles: undefined, role: 'ADMINISTRATOR' }));

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('removes an expired stored token', () => {
      createService(token({ exp: Math.floor(Date.now() / 1000) - 60 }));

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('keeps a valid stored token', () => {
      const jwt = token();
      createService(jwt);

      expect(localStorage.getItem(TOKEN_KEY)).toBe(jwt);
    });

    it('throws when replacing the token with a guest-only token', () => {
      const auth = createService(token());

      expect(() => auth.replaceToken(token({ roles: ['GUEST'] }))).toThrow('Invalid token');
      expect(auth.hasRole('ADMINISTRATOR')).toBe(true);
    });

    it('is not restricted to own data for an administrator that is also a doctor', () => {
      const auth = createService(token({ roles: ['ADMINISTRATOR', 'DOCTOR'] }));

      expect(auth.restrictedToOwnData()).toBe(false);
    });

    it('is restricted to own data for a doctor only', () => {
      const auth = createService(token({ roles: ['DOCTOR'] }));

      expect(auth.restrictedToOwnData()).toBe(true);
    });
  });
});
