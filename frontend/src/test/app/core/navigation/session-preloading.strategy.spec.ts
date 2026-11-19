import { TestBed } from '@angular/core/testing';
import { Route, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { PRELOAD } from '../../../../app/core/navigation/navigation';
import { SessionPreloadingStrategy } from '../../../../app/core/navigation/session-preloading.strategy';

describe('SessionPreloadingStrategy', () => {
  let authenticated: boolean;
  let url: string;
  let load: ReturnType<typeof vi.fn<() => Observable<unknown>>>;
  let strategy: SessionPreloadingStrategy;

  const preloadable: Route = { path: 'dashboard', data: { [PRELOAD]: true } };
  const plain: Route = { path: 'staff' };

  function run(route: Route): unknown[] {
    const emitted: unknown[] = [];
    strategy.preload(route, load).subscribe((value) => emitted.push(value));
    return emitted;
  }

  beforeEach(() => {
    authenticated = false;
    url = '/';
    load = vi.fn(() => of('loaded'));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated } },
        {
          provide: Router,
          useValue: {
            get url() {
              return url;
            },
          },
        },
      ],
    });
    strategy = TestBed.inject(SessionPreloadingStrategy);
  });

  it('preloads marked routes when the user is authenticated', () => {
    authenticated = true;
    url = '/dashboard';

    expect(run(preloadable)).toEqual(['loaded']);
    expect(load).toHaveBeenCalledOnce();
  });

  it('preloads marked routes on the login page for anonymous users', () => {
    url = '/login';

    expect(run(preloadable)).toEqual(['loaded']);
  });

  it('ignores query and fragment when detecting the login page', () => {
    url = '/login?returnUrl=%2Fboard#top';

    expect(run(preloadable)).toEqual(['loaded']);
  });

  it.each(['/', '/register', '/clinic/guest/appointment/clinic', '/activar?token=x'])(
    'does not preload for anonymous visitors on %s',
    (anonymousUrl) => {
      url = anonymousUrl;

      expect(run(preloadable)).toEqual([null]);
      expect(load).not.toHaveBeenCalled();
    },
  );

  it.each(['/login-x', '/login/extra', '/loginx?next=/login', '/board#/login'])(
    'does not treat %s as the login page',
    (lookalikeUrl) => {
      url = lookalikeUrl;

      expect(run(preloadable)).toEqual([null]);
      expect(load).not.toHaveBeenCalled();
    },
  );

  it('accepts the login page with only a fragment', () => {
    url = '/login#top';

    expect(run(preloadable)).toEqual(['loaded']);
  });

  it('reacts to authentication changes between calls', () => {
    url = '/register';
    expect(run(preloadable)).toEqual([null]);

    authenticated = true;
    expect(run(preloadable)).toEqual(['loaded']);

    authenticated = false;
    expect(run(preloadable)).toEqual([null]);
    expect(load).toHaveBeenCalledOnce();
  });

  it('does not preload routes whose marker is falsy', () => {
    authenticated = true;

    expect(run({ path: 'x', data: { [PRELOAD]: false } })).toEqual([null]);
    expect(load).not.toHaveBeenCalled();
  });

  it('does not preload routes with data but no marker', () => {
    authenticated = true;

    expect(run({ path: 'board', data: { other: true } })).toEqual([null]);
    expect(load).not.toHaveBeenCalled();
  });

  it('never preloads routes without the marker', () => {
    authenticated = true;

    expect(run(plain)).toEqual([null]);
    expect(load).not.toHaveBeenCalled();
  });
});
