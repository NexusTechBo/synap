import { FocusMonitor, _IdGenerator } from '@angular/cdk/a11y';
import { CdkOverlayOrigin, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UiIconComponent } from '../ui-icon/ui-icon.component';

const GAP = 8;
const ALIGNMENTS = ['center', 'start', 'end'] as const;

const ABOVE: ConnectedPosition[] = ALIGNMENTS.map((alignment) => ({
  originX: alignment,
  originY: 'top',
  overlayX: alignment,
  overlayY: 'bottom',
  offsetY: -GAP,
}));

const BELOW: ConnectedPosition[] = ALIGNMENTS.map((alignment) => ({
  originX: alignment,
  originY: 'bottom',
  overlayX: alignment,
  overlayY: 'top',
  offsetY: GAP,
}));

const TOP_POSITIONS = [...ABOVE, ...BELOW];
const BOTTOM_POSITIONS = [...BELOW, ...ABOVE];

@Component({
  selector: 'app-help-tooltip',
  imports: [UiIconComponent, OverlayModule, TranslatePipe],
  templateUrl: './help-tooltip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center align-middle' },
})
export class HelpTooltipComponent {
  private readonly focusMonitor = inject(FocusMonitor);
  private readonly destroyRef = inject(DestroyRef);
  private readonly origin = viewChild.required(CdkOverlayOrigin);

  readonly text = input.required<string>();
  readonly ariaLabel = input<string>();
  readonly position = input<'top' | 'bottom'>('top');

  protected readonly isOpen = signal(false);
  private readonly pinned = signal(false);
  protected readonly tooltipId = inject(_IdGenerator).getId('synap-tooltip-');
  protected readonly positions = computed(() =>
    this.position() === 'bottom' ? BOTTOM_POSITIONS : TOP_POSITIONS,
  );

  constructor() {
    afterNextRender(() => {
      const trigger = this.origin().elementRef.nativeElement;
      this.focusMonitor.monitor(trigger).subscribe((origin) => {
        if (origin === 'keyboard') {
          this.pinned.set(true);
          this.isOpen.set(true);
        } else if (origin === null) {
          this.close();
        }
      });
      this.destroyRef.onDestroy(() => this.focusMonitor.stopMonitoring(trigger));
    });
  }

  protected hover(): void {
    this.isOpen.set(true);
  }

  protected leave(): void {
    if (!this.pinned()) {
      this.isOpen.set(false);
    }
  }

  protected toggle(): void {
    const pinned = !this.pinned();
    this.pinned.set(pinned);
    this.isOpen.set(pinned);
  }

  protected close(): void {
    this.pinned.set(false);
    this.isOpen.set(false);
  }

  protected onOverlayKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.close();
  }
}
