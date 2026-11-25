import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ApplicationRef, Component } from '@angular/core';
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

  function pressKey(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    getButton().dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  it('should render trigger button with tooltip hidden by default', () => {
    const button = getButton();
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-describedby')).toBeNull();
    expect(getTooltip()).toBeNull();
  });

  it('should use the translated default aria-label and allow overriding it', () => {
    expect(getButton().getAttribute('aria-label')).toBe('Más información');

    fixture.componentRef.setInput('ariaLabel', 'Ayuda del rol');
    fixture.detectChanges();

    expect(getButton().getAttribute('aria-label')).toBe('Ayuda del rol');
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

  it('should stay open when clicking after hover and ignore mouseleave while pinned', () => {
    const button = getButton();

    button.dispatchEvent(new MouseEvent('mouseenter'));
    button.click();
    fixture.detectChanges();
    expect(getTooltip()).not.toBeNull();

    button.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(getTooltip()).not.toBeNull();

    button.click();
    fixture.detectChanges();
    expect(getTooltip()).toBeNull();
  });

  it('should not open on programmatic focus', () => {
    getButton().focus();
    fixture.detectChanges();

    expect(getTooltip()).toBeNull();
  });

  it('should not open on mouse focus', () => {
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1, detail: 1 }));
    getButton().focus();
    fixture.detectChanges();

    expect(getTooltip()).toBeNull();
  });

  it('should open on keyboard focus and close on blur', () => {
    const button = getButton();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    button.focus();
    fixture.detectChanges();

    const tooltip = getTooltip();
    expect(tooltip).not.toBeNull();
    expect(button.getAttribute('aria-describedby')).toBe(tooltip?.id);

    button.blur();
    fixture.detectChanges();

    expect(getTooltip()).toBeNull();
    expect(button.getAttribute('aria-describedby')).toBeNull();
  });

  it('should close on outside click but not on trigger click', () => {
    const button = getButton();

    button.click();
    fixture.detectChanges();
    expect(getTooltip()).not.toBeNull();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    expect(getTooltip()).toBeNull();
  });

  it('should close on Escape and prevent the event from reaching other handlers', () => {
    getButton().click();
    fixture.detectChanges();
    expect(getTooltip()).not.toBeNull();

    const event = pressKey('Escape');

    expect(getTooltip()).toBeNull();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should ignore Escape and other keys when closed', () => {
    const event = pressKey('Escape');

    expect(event.defaultPrevented).toBe(false);
    expect(getTooltip()).toBeNull();
  });

  it('should ignore keys other than Escape while open', () => {
    getButton().click();
    fixture.detectChanges();

    pressKey('a');

    expect(getTooltip()).not.toBeNull();
  });
});

@Component({
  imports: [HelpTooltipComponent],
  template: `
    <div>
      <app-help-tooltip text="Ayuda dentro del diálogo" />
      <input id="dialog-input" />
    </div>
  `,
})
class DialogContentComponent {}

describe('HelpTooltipComponent inside a CDK dialog', () => {
  let dialog: Dialog;
  let dialogRef: DialogRef<unknown, DialogContentComponent>;
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [DialogContentComponent] });
    dialog = TestBed.inject(Dialog);
    overlayContainer = TestBed.inject(OverlayContainer);
    dialogRef = dialog.open(DialogContentComponent);
    TestBed.tick();
    await TestBed.inject(ApplicationRef).whenStable();
  });

  afterEach(() => {
    dialog.closeAll();
    overlayContainer.ngOnDestroy();
  });

  function trigger(): HTMLButtonElement {
    return overlayContainer
      .getContainerElement()
      .querySelector('app-help-tooltip button') as HTMLButtonElement;
  }

  function tooltip(): HTMLElement | null {
    return overlayContainer.getContainerElement().querySelector('[role="tooltip"]');
  }

  function pressEscape(): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      keyCode: 27,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    TestBed.tick();
    return event;
  }

  it('does not show the tooltip when the dialog opens and the trigger receives programmatic focus', () => {
    trigger().focus();
    TestBed.tick();

    expect(document.activeElement).toBe(trigger());
    expect(tooltip()).toBeNull();
  });

  it('closes only the tooltip on Escape while the dialog stays open', () => {
    trigger().click();
    TestBed.tick();
    expect(tooltip()).not.toBeNull();

    const event = pressEscape();

    expect(tooltip()).toBeNull();
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.openDialogs).toContain(dialogRef);
  });

  it('closes the dialog on a second Escape once the tooltip is gone', () => {
    trigger().click();
    TestBed.tick();
    pressEscape();

    pressEscape();

    expect(dialog.openDialogs).not.toContain(dialogRef);
  });
});
