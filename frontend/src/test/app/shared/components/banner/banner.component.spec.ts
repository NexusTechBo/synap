import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../../../app/core/i18n/i18n.service';
import {
  BannerComponent,
  BannerVariant,
} from '../../../../../app/shared/components/banner/banner.component';

describe('BannerComponent', () => {
  let fixture: ComponentFixture<BannerComponent>;

  function root(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  async function setup(variant?: BannerVariant, language = 'es-BO'): Promise<void> {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(language);
    TestBed.configureTestingModule({ imports: [BannerComponent] });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(BannerComponent);
    if (variant) fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
  }

  function currentSteps(): Element[] {
    return Array.from(root().querySelectorAll('ol li[aria-current="step"]'));
  }

  afterEach(() => vi.restoreAllMocks());

  it('renders the login headline and three stats without steps', async () => {
    await setup('login');

    expect(root().querySelector('p')?.textContent).toContain('Tu agenda,');
    const stats = root().querySelectorAll('ul li');
    expect(stats.length).toBe(3);
    expect(stats[0].textContent).toContain('3');
    expect(stats[1].textContent).toContain('0');
    expect(stats[2].textContent).toContain('24/7');
    expect(root().querySelector('ol')).toBeNull();
  });

  it('renders the register headline, intro and marks step 1 as current', async () => {
    await setup('register');

    expect(root().textContent).toContain('Crea tu espacio.');
    expect(root().textContent).toContain('Tu espacio reúne tu agenda');
    expect(root().querySelector('ul')).toBeNull();
    const steps = root().querySelectorAll('ol li');
    expect(steps.length).toBe(3);
    expect(steps[0].getAttribute('aria-current')).toBe('step');
    expect(steps[0].textContent).toContain('Estás aquí');
    expect(steps[1].getAttribute('aria-current')).toBeNull();
  });

  it('renders the activation headline and marks step 2 as current with step 1 done', async () => {
    await setup('activation');

    expect(root().textContent).toContain('Activa tu espacio.');
    const steps = root().querySelectorAll('ol li');
    expect(steps.length).toBe(3);
    expect(steps[0].getAttribute('aria-current')).toBeNull();
    expect(steps[0].textContent).toContain('Listo');
    expect(steps[1].getAttribute('aria-current')).toBe('step');
    expect(steps[1].textContent).toContain('Estás aquí');
  });

  it('defaults to the login variant when no variant is set', async () => {
    await setup();

    expect(root().querySelector('p')?.textContent).toContain('Tu agenda,');
    expect(root().querySelectorAll('ul li').length).toBe(3);
    expect(root().querySelector('ol')).toBeNull();
  });

  it('marks only step 01 as current in register', async () => {
    await setup('register');

    const current = currentSteps();
    expect(current.length).toBe(1);
    expect(current[0].textContent).toContain('01');
  });

  it('marks only step 02 as current in activation', async () => {
    await setup('activation');

    const current = currentSteps();
    expect(current.length).toBe(1);
    expect(current[0].textContent).toContain('02');
  });

  it('renders the texts in English when the language is English', async () => {
    await setup('register', 'en-US');

    expect(root().textContent).toContain('Create your space.');
    expect(root().textContent).toContain('You are here');
  });
});
