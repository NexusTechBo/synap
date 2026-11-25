import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { UiIconComponent } from '../ui-icon/ui-icon.component';

let nextTooltipId = 0;

/**
 * Reusable accessible help tooltip triggered by an info (`ⓘ`) button alongside form labels or controls.
 *
 * Uses viewport-clamped `fixed` positioning so popovers are never clipped by scrolling modals or containers.
 * Supports mouse hover, keyboard focus (`Tab` / `Escape`), and mobile tap with outside-click dismissal.
 */
@Component({
  selector: 'app-help-tooltip',
  imports: [UiIconComponent],
  templateUrl: './help-tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-flex items-center align-middle',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
    '(window:resize)': 'close()',
    '(window:scroll)': 'close()',
  },
})
export class HelpTooltipComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /** Explanatory message displayed inside the tooltip popover. */
  readonly text = input.required<string>();
  /** Accessible label announced by screen readers for the trigger button. */
  readonly ariaLabel = input('Más información');
  /** Preferred vertical placement relative to the trigger button. */
  readonly position = input<'top' | 'bottom'>('top');

  protected readonly isOpen = signal(false);
  protected readonly coords = signal<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
  }>({
    top: 0,
    left: 0,
    placement: 'top',
  });
  protected readonly tooltipId = `synap-tooltip-${++nextTooltipId}`;

  protected open(): void {
    this.updatePosition();
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  protected onDocumentClick(event: Event): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target as Node | null;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.close();
    }
  }

  private updatePosition(): void {
    const button = this.trigger()?.nativeElement;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 1024;
    const tooltipWidth = Math.min(256, viewportWidth - 24);
    const margin = 12;

    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const clampedLeft = Math.max(
      margin,
      Math.min(centeredLeft, viewportWidth - tooltipWidth - margin),
    );

    const preferBottom = this.position() === 'bottom' || rect.top < 120;
    const placement: 'top' | 'bottom' = preferBottom ? 'bottom' : 'top';
    const top = placement === 'bottom' ? rect.bottom + 8 : rect.top - 8;

    this.coords.set({ top, left: clampedLeft, placement });
  }
}
