import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LANDING_ANCHORS } from '../../../../app/features/landing/constants/landing.content';
import { LandingPageComponent } from '../../../../app/features/landing/landing-page.component';

describe('LandingPageComponent', () => {
  let fixture: ComponentFixture<LandingPageComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(LandingPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('orders the sections audience, features, roles and how it works', () => {
    const ids = [...element.querySelectorAll('main section[id]')].map((s) => s.id);
    expect(ids).toEqual(['para-quien', 'funciones', 'roles', 'como-funciona']);
  });

  it('keeps the anchor ids used by the navigation', () => {
    expect(LANDING_ANCHORS).toEqual({
      audience: 'para-quien',
      features: 'funciones',
      roles: 'roles',
      howItWorks: 'como-funciona',
    });
  });

  it('links the header navigation to existing sections', () => {
    const targets = [...element.querySelectorAll<HTMLAnchorElement>('header a[href^="#"]')].map(
      (a) => a.getAttribute('href')!.slice(1),
    );
    expect(targets).toEqual(['para-quien', 'funciones', 'roles', 'como-funciona']);
    targets.forEach((id) => expect(element.querySelector(`[id="${id}"]`)).not.toBeNull());
  });

  it('places the header before the main content and the footer after it', () => {
    const children = [...element.children].map((c) => c.tagName.toLowerCase());
    expect(children.indexOf('app-header-landing-page')).toBeLessThan(children.indexOf('main'));
    expect(children.indexOf('main')).toBeLessThan(children.indexOf('app-footer-landing-page'));
  });

  it('no longer renders the removed showcase and stats sections', () => {
    expect(element.querySelector('app-showcase-landing-page')).toBeNull();
    expect(element.querySelector('app-stats-landing-page')).toBeNull();
  });

  describe('footer', () => {
    it('credits the designer with the Moonshine logo', () => {
      const footer = element.querySelector('footer')!;
      expect(footer.textContent).toContain('Designed by');
      expect(
        footer.querySelector('app-moonshine-logo [role="img"]')?.getAttribute('aria-label'),
      ).toBe('Moonshine Technologies');
    });

    it('shows the Pulso logo', () => {
      expect(
        element.querySelector('footer app-pulso-logo [role="img"]')?.getAttribute('aria-label'),
      ).toBe('Pulso');
    });
  });

  it('does not mention the old ClinicFlow brand anywhere', () => {
    expect(element.textContent).not.toMatch(/clinicflow/i);
    expect(element.innerHTML).not.toMatch(/clinicflow/i);
  });
});
