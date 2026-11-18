import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { I18nService } from '../../../../../app/core/i18n/i18n.service';
import { BackToHomeLinkComponent } from '../../../../../app/shared/components/back-to-home-link/back-to-home-link.component';

describe('BackToHomeLinkComponent', () => {
  let fixture: ComponentFixture<BackToHomeLinkComponent>;

  function link(): HTMLAnchorElement {
    return (fixture.nativeElement as HTMLElement).querySelector('a')!;
  }

  async function setup(browserLanguage: string): Promise<void> {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browserLanguage);
    TestBed.configureTestingModule({
      imports: [BackToHomeLinkComponent],
      providers: [provideRouter([])],
    });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(BackToHomeLinkComponent);
    fixture.detectChanges();
  }

  afterEach(() => vi.restoreAllMocks());

  it('points to the root path', async () => {
    await setup('es-BO');

    expect(link().getAttribute('href')).toBe('/');
  });

  it('renders the translated text in spanish', async () => {
    await setup('es-BO');

    expect(link().textContent?.trim()).toBe('Volver al inicio');
  });

  it('renders the arrow icon', async () => {
    await setup('es-BO');

    expect(link().querySelector('app-ui-icon')).not.toBeNull();
  });

  it('renders the translated text in english for a non-Spanish browser', async () => {
    await setup('en-US');

    expect(link().textContent?.trim()).toBe('Back to home');
  });

  it('navigates to the root when clicked', async () => {
    await setup('es-BO');
    const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');

    link().click();

    expect(navigateByUrl).toHaveBeenCalledTimes(1);
    expect(navigateByUrl.mock.calls[0][0].toString()).toBe('/');
  });
});
