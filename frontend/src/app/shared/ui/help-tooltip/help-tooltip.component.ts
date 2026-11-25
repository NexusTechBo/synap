import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { UiIconComponent } from '../ui-icon/ui-icon.component';

let nextTooltipId = 0;

/**
 * Reusable accessible help tooltip triggered by an info (`ⓘ`) button alongside form labels or controls.
 *
 * Supports mouse hover, keyboard focus (`Tab` / `Escape`), and mobile tap with outside-click dismissal.
 *
 * @example
 * ```html
 * <app-help-tooltip [text]="'register.clinicSlugTooltip' | translate" />
 * ```
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
  },
})
export class HelpTooltipComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  /** Explanatory message displayed inside the tooltip popover. */
  readonly text = input.required<string>();
  /** Accessible label announced by screen readers for the trigger button. */
  readonly ariaLabel = input('Más información');
  /** Preferred vertical placement relative to the trigger button. */
  readonly position = input<'top' | 'bottom'>('top');

  protected readonly isOpen = signal(false);
  protected readonly tooltipId = `synap-tooltip-${++nextTooltipId}`;

  protected open(): void {
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.isOpen.update((current) => !current);
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
}
