import { Component, input, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../../../app/core/auth/auth.service';
import { I18nService } from '../../../../app/core/i18n/i18n.service';
import { FULL_HEIGHT } from '../../../../app/core/navigation/navigation';
import { SidebarNavComponent } from '../../../../app/layout/shell/components/sidebar-nav/sidebar-nav.component';
import { TopbarComponent } from '../../../../app/layout/shell/components/topbar/topbar.component';
import { ShellComponent } from '../../../../app/layout/shell/shell.component';
import { GlassBackgroundComponent } from '../../../../app/shared/ui/glass-background/glass-background.component';

@Component({ selector: 'app-page', template: 'page' })
class PageStubComponent {}

@Component({ selector: 'app-sidebar-nav', template: '' })
class SidebarStubComponent {
  readonly navItems = input<unknown>();
  readonly clinicName = input<string>();
  readonly roleLabel = input<string>();
  readonly logout = output<void>();
}

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {
  readonly userName = input<string>();
  readonly roleLabel = input<string>();
  readonly menuOpen = input<boolean>();
  readonly menu = output<void>();
}

describe('ShellComponent layout scroll', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let router: Router;

  const column = () =>
    (fixture.nativeElement as HTMLElement).querySelector('app-glass-background > div')!
      .firstElementChild as HTMLElement;
  const scroller = () =>
    (fixture.nativeElement as HTMLElement).querySelector(
      'app-glass-background > div',
    ) as HTMLElement;
  const main = () => (fixture.nativeElement as HTMLElement).querySelector('main') as HTMLElement;

  async function navigate(url: string) {
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function setup(initialUrl: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'board', component: PageStubComponent, data: { [FULL_HEIGHT]: true } },
          { path: 'patients', component: PageStubComponent },
          { path: 'calendar', component: PageStubComponent },
        ]),
        {
          provide: AuthService,
          useValue: {
            roles: signal([]),
            session: signal({}),
            clinic: signal(null),
            displayName: signal('Test'),
            logout: vi.fn(),
          },
        },
        {
          provide: I18nService,
          useValue: { currentLang: signal('es'), translate: (key: string) => key },
        },
      ],
    });
    TestBed.overrideComponent(ShellComponent, {
      remove: { imports: [SidebarNavComponent, TopbarComponent, GlassBackgroundComponent] },
      add: { imports: [SidebarStubComponent, TopbarStubComponent, GlassStubComponent] },
    });
    router = TestBed.inject(Router);
    await router.navigateByUrl(initialUrl);
    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    );
  });

  it('scrolls the full-width wrapper as a unit on a normal route', async () => {
    await setup('/patients');

    expect(scroller().classList).toContain('overflow-y-auto');
    expect(column().classList).toContain('min-h-full');
    expect(main().classList).not.toContain('overflow-hidden');
    expect(main().classList).not.toContain('min-h-0');
  });

  it('locks the height on a route flagged fullHeight', async () => {
    await setup('/board');

    expect(scroller().classList).not.toContain('overflow-y-auto');
    expect(column().classList).toContain('h-full');
    expect(main().classList).toContain('overflow-hidden');
    expect(main().classList).toContain('min-h-0');
  });

  it('toggles layout classes when navigating between board and another route', async () => {
    await setup('/patients');

    await navigate('/board');
    expect(scroller().classList).not.toContain('overflow-y-auto');
    expect(main().classList).toContain('overflow-hidden');

    await navigate('/calendar');
    expect(scroller().classList).toContain('overflow-y-auto');
    expect(main().classList).not.toContain('overflow-hidden');
  });
});

@Component({ selector: 'app-glass-background', template: '<ng-content />' })
class GlassStubComponent {}
