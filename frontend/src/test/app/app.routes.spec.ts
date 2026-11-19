import { Route } from '@angular/router';
import { routes } from '../../app/app.routes';
import { PRELOAD } from '../../app/core/navigation/navigation';

describe('app routes preloading', () => {
  const shell = routes.find((route) => route.path === '' && route.children);
  const children = shell?.children ?? [];

  function child(path: string): Route | undefined {
    return children.find((route) => route.path === path);
  }

  it('marks the authenticated shell for preloading', () => {
    expect(shell?.data?.[PRELOAD]).toBe(true);
  });

  it.each(['dashboard', 'board', 'calendar', 'appointments'])('marks %s for preloading', (path) => {
    expect(child(path)?.data?.[PRELOAD]).toBe(true);
  });

  it.each(['appointments/new', 'patients', 'availability', 'staff', 'specialties', 'profile'])(
    'does not mark %s for preloading',
    (path) => {
      expect(child(path)).toBeDefined();
      expect(child(path)?.data?.[PRELOAD]).toBeUndefined();
    },
  );

  it('does not mark the landing page for preloading', () => {
    const landing = routes.find((route) => route.path === '' && !route.children);

    expect(landing).toBeDefined();
    expect(landing?.data?.[PRELOAD]).toBeUndefined();
  });

  it.each(['login', 'register', 'activar'])('does not mark %s for preloading', (path) => {
    const route = routes.find((candidate) => candidate.path === path);

    expect(route).toBeDefined();
    expect(route?.data?.[PRELOAD]).toBeUndefined();
  });

  it('does not mark the guest booking route for preloading', () => {
    const guest = routes.find((route) => route.path?.includes('guest'));

    expect(guest).toBeDefined();
    expect(guest?.data?.[PRELOAD]).toBeUndefined();
  });
});
