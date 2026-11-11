import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { addDays, toIso } from '../../../../core/utils/calendar.util';
import { DATE_STRIP_DAYS, DateStripComponent } from './date-strip.component';

const TODAY = toIso(new Date());
const TOMORROW = toIso(addDays(new Date(), 1));
const BEYOND_STRIP = toIso(addDays(new Date(), DATE_STRIP_DAYS + 5));
const UNAVAILABLE_TEXT = 'sin horarios disponibles';

describe('DateStripComponent', () => {
  let fixture: ComponentFixture<DateStripComponent>;
  let element: HTMLElement;
  let selections: string[];

  async function render(selected: string, unavailableDates?: string[]): Promise<void> {
    fixture.componentRef.setInput('selected', selected);
    if (unavailableDates) fixture.componentRef.setInput('unavailableDates', unavailableDates);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  function chips(): HTMLButtonElement[] {
    return [...element.querySelectorAll('button')];
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZoneChangeDetection()] });
    fixture = TestBed.createComponent(DateStripComponent);
    element = fixture.nativeElement;
    selections = [];
    fixture.componentInstance.select.subscribe((iso) => selections.push(iso));
  });

  describe('without unavailable dates', () => {
    it('renders the strip as always: primary selected day and neutral days', async () => {
      await render(TODAY);

      const [selected, other] = chips();
      expect(chips()).toHaveLength(DATE_STRIP_DAYS);
      expect(selected.className).toContain('bg-primary');
      expect(selected.getAttribute('aria-pressed')).toBe('true');
      expect(other.className).toContain('bg-white/50');
      expect(other.getAttribute('aria-pressed')).toBe('false');
      expect(element.innerHTML).not.toContain('red-');
      expect(element.textContent).not.toContain(UNAVAILABLE_TEXT);
    });

    it('appends a selected date beyond the strip as an extra chip', async () => {
      await render(BEYOND_STRIP);

      expect(chips()).toHaveLength(DATE_STRIP_DAYS + 1);
      expect(chips().at(-1)!.className).toContain('bg-primary');
    });
  });

  describe('with unavailable dates', () => {
    it('greys out and disables an unavailable day that is not selected', async () => {
      await render(TODAY, [TOMORROW]);

      const chip = chips()[1];
      expect(chip.className).toContain('bg-gray-100');
      expect(chip.className).toContain('text-gray-400');
      expect(chip.className).not.toContain('bg-white/50');
      expect(chip.disabled).toBe(true);
      expect(chip.getAttribute('aria-pressed')).toBe('false');
    });

    it('keeps an unavailable selected day enabled, marked as selected and grey', async () => {
      await render(TOMORROW, [TOMORROW]);

      const chip = chips()[1];
      expect(chip.className).toContain('bg-gray-300');
      expect(chip.className).not.toContain('bg-primary');
      expect(chip.disabled).toBe(false);
      expect(chip.getAttribute('aria-pressed')).toBe('true');
    });

    it('leaves the available days as they are', async () => {
      await render(TODAY, [TOMORROW]);

      const [selected, , other] = chips();
      expect(selected.className).toContain('bg-primary');
      expect(other.className).toContain('bg-white/50');
      expect(other.disabled).toBe(false);
      expect(other.textContent).not.toContain(UNAVAILABLE_TEXT);
    });

    it('exposes the state as text while keeping the date readable', async () => {
      await render(TODAY, [TOMORROW]);

      const chip = chips()[1];
      expect(chip.querySelector('.sr-only')?.textContent).toContain(UNAVAILABLE_TEXT);
      expect(chip.textContent).toContain(String(addDays(new Date(), 1).getDate()));
      expect(chip.hasAttribute('aria-label')).toBe(false);
    });

    it('does not let the user select an unavailable day', async () => {
      await render(TODAY, [TOMORROW]);

      chips()[1].click();

      expect(selections).toEqual([]);
    });

    it('greys out the extra chip of a date beyond the strip', async () => {
      await render(BEYOND_STRIP, [BEYOND_STRIP]);

      expect(chips().at(-1)!.className).toContain('bg-gray-300');
    });

    it('enables the days again when the input is emptied', async () => {
      await render(TODAY, [TOMORROW]);

      await render(TODAY, []);

      expect(chips().some((chip) => chip.disabled)).toBe(false);
      expect(element.textContent).not.toContain(UNAVAILABLE_TEXT);
    });
  });
});
