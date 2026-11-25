import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationService } from '../../../../../app/shared/services/notification.service';
import { NotificationComponent } from '../../../../../app/shared/ui/notification/notification.component';

describe('NotificationComponent', () => {
  let fixture: ComponentFixture<NotificationComponent>;
  let element: HTMLElement;
  let service: NotificationService;
  let showPopover: ReturnType<typeof vi.fn>;
  let hidePopover: ReturnType<typeof vi.fn>;

  function render(): void {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
    TestBed.tick();
  }

  function liveRegion(): HTMLElement {
    return element.querySelectorAll('[aria-live="polite"]')[0] as HTMLElement;
  }

  function alertRegion(): HTMLElement {
    return element.querySelector('[role="alert"]') as HTMLElement;
  }

  function closeButtons(): HTMLButtonElement[] {
    return Array.from(element.querySelectorAll('button'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    showPopover = vi.fn();
    hidePopover = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: showPopover,
    });
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
      configurable: true,
      value: hidePopover,
    });
    TestBed.configureTestingModule({ imports: [NotificationComponent] });
    service = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(NotificationComponent);
    element = fixture.nativeElement;
    render();
  });

  afterEach(() => {
    fixture.destroy();
    delete (HTMLElement.prototype as { showPopover?: unknown }).showPopover;
    delete (HTMLElement.prototype as { hidePopover?: unknown }).hidePopover;
    vi.useRealTimers();
  });

  it('renders both live regions empty when there are no notifications', () => {
    expect(liveRegion().textContent?.trim()).toBe('');
    expect(alertRegion().textContent?.trim()).toBe('');
    expect(showPopover).not.toHaveBeenCalled();
  });

  it('announces the latest success message in the polite region only', () => {
    service.success('first');
    service.success('second');
    render();

    expect(liveRegion().textContent?.trim()).toBe('second');
    expect(alertRegion().textContent?.trim()).toBe('');
  });

  it('announces the latest error message in the alert region only', () => {
    service.error('failed');
    render();

    expect(alertRegion().textContent?.trim()).toBe('failed');
    expect(liveRegion().textContent?.trim()).toBe('');
  });

  it('hides the visual text from assistive technology', () => {
    service.success('saved');
    render();

    const text = element.querySelector('p') as HTMLElement;
    expect(text.textContent?.trim()).toBe('saved');
    expect(text.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses a manual popover container', () => {
    expect(element.querySelector('[popover]')?.getAttribute('popover')).toBe('manual');
  });

  it('hides and shows the popover when a new notification arrives', () => {
    service.success('saved');
    render();

    expect(hidePopover).not.toHaveBeenCalled();
    expect(showPopover).toHaveBeenCalledTimes(1);

    service.error('failed');
    render();

    expect(hidePopover).toHaveBeenCalledTimes(1);
    expect(showPopover).toHaveBeenCalledTimes(2);
  });

  it('does not show again when dismissing while other notifications remain', () => {
    service.success('first');
    render();
    service.success('second');
    render();
    showPopover.mockClear();
    hidePopover.mockClear();

    closeButtons()[0].click();
    render();

    expect(element.querySelectorAll('p')).toHaveLength(1);
    expect(showPopover).not.toHaveBeenCalled();
    expect(hidePopover).not.toHaveBeenCalled();
  });

  it('hides the popover when the list becomes empty', () => {
    service.success('saved');
    render();
    hidePopover.mockClear();

    closeButtons()[0].click();
    render();

    expect(hidePopover).toHaveBeenCalledTimes(1);
  });

  it('does not hide the popover when the list stays empty', () => {
    render();

    expect(hidePopover).not.toHaveBeenCalled();
  });

  it('labels the close button and dismisses the matching notification', () => {
    service.success('saved');
    render();
    const button = closeButtons()[0];

    expect(button.getAttribute('aria-label')).toBe('Cerrar notificación');
    button.click();
    render();

    expect(service.notifications()).toEqual([]);
  });

  it('works when the browser does not support the popover api', () => {
    delete (HTMLElement.prototype as { showPopover?: unknown }).showPopover;
    delete (HTMLElement.prototype as { hidePopover?: unknown }).hidePopover;

    expect(() => {
      service.success('saved');
      render();
      closeButtons()[0].click();
      render();
    }).not.toThrow();
  });
});
