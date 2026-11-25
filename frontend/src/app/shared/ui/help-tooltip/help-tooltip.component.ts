import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { UiIconComponent } from '../ui-icon/ui-icon.component';

let nextTooltipId = 0;

const TOP_POSITIONS: ConnectedPosition[] = [
  {
    originX: 'center',
    originY: 'top',
    overlayX: 'center',
    overlayY: 'bottom',
    offsetY: -8,
  },
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'bottom',
    offsetY: -8,
  },
  {
    originX: 'end',
    originY: 'top',
    overlayX: 'end',
    overlayY: 'bottom',
    offsetY: -8,
  },
  {
    originX: 'center',
    originY: 'bottom',
    overlayX: 'center',
    overlayY: 'top',
    offsetY: 8,
  },
  {
    originX: 'start',
    originY: 'bottom',
    overlayX: 'start',
    overlayY: 'top',
    offsetY: 8,
  },
  {
    originX: 'end',
    originY: 'bottom',
    overlayX: 'end',
    overlayY: 'top',
    offsetY: 8,
  },
];

const BOTTOM_POSITIONS: ConnectedPosition[] = [
  {
    originX: 'center',
    originY: 'bottom',
    overlayX: 'center',
    overlayY: 'top',
    offsetY: 8,
  },
  {
    originX: 'start',
    originY: 'bottom',
    overlayX: 'start',
    overlayY: 'top',
    offsetY: 8,
  },
  {
    originX: 'end',
    originY: 'bottom',
    overlayX: 'end',
    overlayY: 'top',
    offsetY: 8,
  },
  {
    originX: 'center',
    originY: 'top',
    overlayX: 'center',
    overlayY: 'bottom',
    offsetY: -8,
  },
  {
    originX: 'start',
    originY: 'top',
    overlayX: 'start',
    overlayY: 'bottom',
    offsetY: -8,
  },
  {
    originX: 'end',
    originY: 'top',
    overlayX: 'end',
    overlayY: 'bottom',
    offsetY: -8,
  },
];

/**
 * Reusable accessible help tooltip triggered by an info (`ⓘ`) button alongside form labels or controls.
 *
 * Uses Angular CDK Overlay so popovers render outside scrolling modals without clipping and
 * automatically flip/shift to stay within the viewport.
 */
@Component({
  selector: 'app-help-tooltip',
  imports: [UiIconComponent, OverlayModule],
  templateUrl: './help-tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center align-middle',
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
  protected readonly positions = computed(() =>
    this.position() === 'bottom' ? BOTTOM_POSITIONS : TOP_POSITIONS,
  );

  protected open(): void {
    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.isOpen.update((v) => !v);
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
