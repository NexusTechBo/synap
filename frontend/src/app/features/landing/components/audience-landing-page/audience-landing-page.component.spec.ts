import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { LANDING_ANCHORS, LANDING_AUDIENCES } from '../../constants/landing.content';
import { AudienceLandingPageComponent } from './audience-landing-page.component';

describe('AudienceLandingPageComponent', () => {
  let fixture: ComponentFixture<AudienceLandingPageComponent>;
  let element: HTMLElement;
  let i18n: I18nService;

  beforeEach(async () => {
    fixture = TestBed.createComponent(AudienceLandingPageComponent);
    i18n = TestBed.inject(I18nService);
    element = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('anchors the section with the "para-quien" id', () => {
    expect(LANDING_ANCHORS.audience).toBe('para-quien');
    expect(element.querySelector('section')?.id).toBe('para-quien');
  });

  it('renders the translated eyebrow and title', () => {
    expect(element.querySelector('p')?.textContent?.trim()).toBe(
      i18n.translate('landing.audience.eyebrow'),
    );
    expect(element.querySelector('h2')?.textContent?.trim()).toBe(
      i18n.translate('landing.audience.title'),
    );
  });

  it('renders exactly four audience cards', () => {
    expect(LANDING_AUDIENCES).toHaveLength(4);
    expect(element.querySelectorAll('li')).toHaveLength(4);
  });

  it('shows each card with its translated title and description', () => {
    const cards = [...element.querySelectorAll('li')];
    LANDING_AUDIENCES.forEach((audience, index) => {
      expect(cards[index].querySelector('h3')?.textContent?.trim()).toBe(
        i18n.translate(audience.titleKey),
      );
      expect(cards[index].querySelector('p')?.textContent?.trim()).toBe(
        i18n.translate(audience.descriptionKey),
      );
    });
  });

  it('never shows raw translation keys', () => {
    expect(element.textContent).not.toContain('landing.audience');
  });
});
