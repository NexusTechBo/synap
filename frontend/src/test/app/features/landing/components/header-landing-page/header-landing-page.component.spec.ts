import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { AuthService } from '../../../../../../app/core/auth/auth.service';
import { HOME_URL } from '../../../../../../app/core/navigation/navigation';
import { HeaderLandingPageComponent } from '../../../../../../app/features/landing/components/header-landing-page/header-landing-page.component';

describe('HeaderLandingPageComponent', () => {
  let session: ReturnType<typeof signal<object | null>>;
  let element: HTMLElement;
  let fixture: ComponentFixture<HeaderLandingPageComponent>;

  function create(restore: Observable<boolean>): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { session, restoreStoredSession: vi.fn(() => restore) },
        },
      ],
    });
    fixture = TestBed.createComponent(HeaderLandingPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  }

  function authLinks(): string[] {
    return [...element.querySelectorAll<HTMLAnchorElement>('.btn')].map(
      (a) => a.getAttribute('href') ?? '',
    );
  }

  beforeEach(() => {
    session = signal<object | null>(null);
  });

  it('shows the login and register links when restoration resolves to false', () => {
    create(of(false));

    expect(authLinks()).toEqual(['/login', '/register']);
  });

  it('shows only the dashboard link when a session exists', () => {
    session.set({ token: 'a' });
    create(of(true));

    expect(authLinks()).toEqual([HOME_URL]);
  });

  it('shows the dashboard link for an existing session even while restoration is pending', () => {
    session.set({ token: 'a' });
    create(new Subject<boolean>());

    expect(authLinks()).toEqual([HOME_URL]);
  });

  describe('while the restoration is pending', () => {
    let restore: Subject<boolean>;

    beforeEach(() => {
      restore = new Subject<boolean>();
      create(restore);
    });

    it('renders a hidden placeholder and no auth links', () => {
      const placeholder = element.querySelector('span.invisible');

      expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
      expect(authLinks()).toEqual([]);
    });

    it('switches to the dashboard link once the session is restored', () => {
      session.set({ token: 'a' });
      restore.next(true);
      fixture.detectChanges();

      expect(authLinks()).toEqual([HOME_URL]);
      expect(element.querySelector('span.invisible')).toBeNull();
    });

    it('switches to the guest links when the restoration fails', () => {
      restore.next(false);
      fixture.detectChanges();

      expect(authLinks()).toEqual(['/login', '/register']);
      expect(element.querySelector('span.invisible')).toBeNull();
    });
  });

  it('shows the guest links when the session is closed after being restored', () => {
    session.set({ token: 'a' });
    create(of(true));

    session.set(null);
    fixture.detectChanges();

    expect(authLinks()).toEqual(['/login', '/register']);
  });
});
