import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HelpTooltipComponent } from '../../../../../app/shared/ui/help-tooltip/help-tooltip.component';

describe('HelpTooltipComponent', () => {
  let fixture: ComponentFixture<HelpTooltipComponent>;
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpTooltipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpTooltipComponent);
    overlayContainer = TestBed.inject(OverlayContainer);
    fixture.componentRef.setInput('text', 'Explicación de prueba para el campo');
    fixture.detectChanges();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  function getButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  function getTooltip(): HTMLElement | null {
    return overlayContainer.getContainerElement().querySelector('[role="tooltip"]');
  }

  it('should render trigger button with tooltip hidden by default', () => {
    const button = getButton();
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-describedby')).toBeNull();
    expect(getTooltip()).toBeNull();
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
    expect(getButton().getAttribute('aria-expanded')).toBe('false');
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
    expect(button.getAttribute('aria-describedby')).toBeNull();
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
