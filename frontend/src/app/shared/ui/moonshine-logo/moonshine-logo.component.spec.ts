import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoonshineLogoComponent } from './moonshine-logo.component';

describe('MoonshineLogoComponent', () => {
  let fixture: ComponentFixture<MoonshineLogoComponent>;
  let element: HTMLElement;

  async function render(inputs: Record<string, unknown> = {}): Promise<void> {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const root = () => element.querySelector<HTMLElement>('[role="img"]')!;

  beforeEach(() => {
    fixture = TestBed.createComponent(MoonshineLogoComponent);
    element = fixture.nativeElement;
  });

  it('exposes the company name as an accessible image', async () => {
    await render();
    expect(root().getAttribute('aria-label')).toBe('Moonshine Technologies');
  });

  it('is white by default', async () => {
    await render();
    expect(root().style.color).toBe('rgb(255, 255, 255)');
  });

  it('applies the given color', async () => {
    await render({ color: '#112233' });
    expect(root().style.color).toBe('rgb(17, 34, 51)');
  });

  it('renders the TECHNOLOGIES tagline', async () => {
    await render();
    const tagline = [...element.querySelectorAll('[role="img"] > span')][1];
    expect(tagline.textContent?.replace(/\s/g, '')).toBe('TECHNOLOGIES');
  });

  it('scales the icons with the size input', async () => {
    await render({ size: 84 });
    const widths = [...element.querySelectorAll('svg')].map((s) => s.getAttribute('width'));
    expect(widths).toEqual(['46', '46']);
  });
});
