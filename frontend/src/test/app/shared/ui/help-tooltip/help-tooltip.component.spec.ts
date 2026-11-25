import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpTooltipComponent } from '../../../../../app/shared/ui/help-tooltip/help-tooltip.component';

@Component({
  imports: [HelpTooltipComponent],
  template: `<app-help-tooltip [text]="tooltipText" [ariaLabel]="label" />`,
})
class TestHostComponent {
  tooltipText = 'Explicación de prueba para el campo';
  label = 'Ayuda sobre el campo';
}

describe('HelpTooltipComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  const getButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  const getTooltip = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[role="tooltip"]');

  it('should hide the tooltip by default', () => {
    expect(getTooltip()).toBeNull();
    expect(getButton().getAttribute('aria-expanded')).toBe('false');
    expect(getButton().getAttribute('aria-describedby')).toBeNull();
  });

  it('should show on mouseenter and hide on mouseleave', () => {
    const button = getButton();

    button.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(getTooltip()?.textContent?.trim()).toBe('Explicación de prueba para el campo');
    expect(getButton().getAttribute('aria-expanded')).toBe('true');

    button.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(getTooltip()).toBeNull();
  });

  it('should show on focus and hide on blur for keyboard accessibility', () => {
    const button = getButton();

    button.dispatchEvent(new FocusEvent('focus'));
    fixture.detectChanges();

    const tooltip = getTooltip();
    expect(tooltip).not.toBeNull();
    expect(button.getAttribute('aria-describedby')).toBe(tooltip?.id);

    button.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(getTooltip()).toBeNull();
  });

  it('should toggle on click/tap and close on outside click or Escape key', () => {
    const button = getButton();

    button.click();
    fixture.detectChanges();
    expect(getTooltip()).not.toBeNull();

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(getTooltip()).toBeNull();

    button.click();
    fixture.detectChanges();
    expect(getTooltip()).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(getTooltip()).toBeNull();
  });
});
