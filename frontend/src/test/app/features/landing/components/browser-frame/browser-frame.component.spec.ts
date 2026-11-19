import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserFrameComponent } from '../../../../../../app/features/landing/components/browser-frame/browser-frame.component';
import { HERO_SHOT } from '../../../../../../app/features/landing/constants/landing.content';
import { LandingShot } from '../../../../../../app/features/landing/landing.model';

describe('BrowserFrameComponent', () => {
  let fixture: ComponentFixture<BrowserFrameComponent>;

  const image = () => fixture.nativeElement.querySelector('img') as HTMLImageElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(BrowserFrameComponent);
    fixture.componentRef.setInput('shot', HERO_SHOT);
  });

  it('renders the responsive sources with intrinsic dimensions', () => {
    fixture.detectChanges();
    expect(image().getAttribute('srcset')).toBe(HERO_SHOT.srcset);
    expect(image().getAttribute('sizes')).toBe(HERO_SHOT.sizes);
    expect(image().getAttribute('width')).toBe('1440');
    expect(image().getAttribute('height')).toBe('900');
  });

  it('uses the hero src as the largest srcset candidate', () => {
    const candidates = HERO_SHOT.srcset.split(',').map((c) => c.trim().split(' '));
    const [largestUrl, largestWidth] = candidates[candidates.length - 1];
    expect(largestUrl).toBe(HERO_SHOT.src);
    expect(largestWidth).toBe(HERO_SHOT.width + 'w');
  });

  it('declares ascending width descriptors in the hero srcset', () => {
    const widths = HERO_SHOT.srcset.split(',').map((c) => parseInt(c.trim().split(' ')[1], 10));
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
    expect(new Set(widths).size).toBe(widths.length);
  });

  it('renders the attributes of a custom shot', () => {
    const custom: LandingShot = {
      src: 'landing/other.webp',
      srcset: 'landing/other-300.webp 300w, landing/other.webp 600w',
      sizes: '(min-width: 640px) 300px, 100vw',
      width: 600,
      height: 400,
      altKey: 'landing.hero.shotAlt',
    };
    fixture.componentRef.setInput('shot', custom);
    fixture.detectChanges();
    expect(image().getAttribute('src')).toBe(custom.src);
    expect(image().getAttribute('srcset')).toBe(custom.srcset);
    expect(image().getAttribute('sizes')).toBe(custom.sizes);
    expect(image().getAttribute('width')).toBe('600');
    expect(image().getAttribute('height')).toBe('400');
  });

  it('is lazy by default and prioritized when eager', () => {
    fixture.detectChanges();
    expect(image().getAttribute('loading')).toBe('lazy');
    expect(image().getAttribute('fetchpriority')).toBeNull();

    fixture.componentRef.setInput('eager', true);
    fixture.detectChanges();
    expect(image().getAttribute('loading')).toBe('eager');
    expect(image().getAttribute('fetchpriority')).toBe('high');
  });
});
