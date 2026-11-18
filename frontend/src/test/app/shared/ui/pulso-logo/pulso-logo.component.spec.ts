import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PulsoLogoComponent,
  PulsoLogoVariant,
} from '../../../../../app/shared/ui/pulso-logo/pulso-logo.component';

describe('PulsoLogoComponent', () => {
  let fixture: ComponentFixture<PulsoLogoComponent>;
  let element: HTMLElement;

  async function render(inputs: Record<string, unknown> = {}): Promise<void> {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const bg = () => element.querySelector('rect')!.getAttribute('fill');
  const stroke = () => element.querySelector('path')!.getAttribute('stroke');
  const dot = () => element.querySelector('circle')!.getAttribute('fill');
  const wordmark = () =>
    element.querySelector<HTMLElement>('[role="img"] > span[aria-hidden="true"]');

  beforeEach(() => {
    fixture = TestBed.createComponent(PulsoLogoComponent);
    element = fixture.nativeElement;
  });

  it('exposes the Pulso name as an accessible image', async () => {
    await render();
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Pulso');
  });

  it('hides the decorative svg from assistive technology', async () => {
    await render();
    expect(element.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses the positive variant by default', async () => {
    await render();
    expect(bg()).toBe('#1F5BD6');
    expect(wordmark()?.style.color).toBe('rgb(10, 37, 64)');
  });

  it.each<[PulsoLogoVariant, string, string, string, string]>([
    ['positive', '#1F5BD6', '#FFFFFF', '#38A8E8', 'rgb(10, 37, 64)'],
    ['negative', '#FFFFFF', '#1F5BD6', '#38A8E8', 'rgb(255, 255, 255)'],
    ['dark', '#1F5BD6', '#FFFFFF', '#7DD3FC', 'rgb(255, 255, 255)'],
  ])('applies the %s palette', async (variant, bgColor, strokeColor, dotColor, wordColor) => {
    await render({ variant });
    expect(bg()).toBe(bgColor);
    expect(stroke()).toBe(strokeColor);
    expect(dot()).toBe(dotColor);
    expect(wordmark()?.style.color).toBe(wordColor);
  });

  it('renders the wordmark by default', async () => {
    await render();
    expect(wordmark()?.textContent?.trim()).toBe('pulso');
  });

  it('omits the wordmark when disabled and keeps the accessible name', async () => {
    await render({ wordmark: false });
    expect(wordmark()).toBeNull();
    expect(element.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Pulso');
  });

  it('sizes the icon from the size input', async () => {
    await render({ size: 48 });
    const svg = element.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('48');
    expect(svg.getAttribute('height')).toBe('48');
  });
});
