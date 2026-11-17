import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

const TOKEN_KEY = 'scheduler.token';

function b64(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function token(extra: Record<string, unknown> = {}): string {
  const payload = {
    sub: '5',
    role: 'ADMINISTRATOR',
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
});
