import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
} from "@angular/core";
import { UiIconComponent } from "../ui-icon/ui-icon.component";

let nextTooltipId = 0;

@Component({
  selector: "app-help-tooltip",
  imports: [UiIconComponent],
  templateUrl: "./help-tooltip.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "relative inline-flex items-center align-middle",
    "(document:click)": "onDocumentClick($event)",
    "(document:keydown.escape)": "close()",
  },
})
export class HelpTooltipComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly text = input.required<string>();
  readonly ariaLabel = input("Más información");
  readonly position = input<"top" | "bottom">("top");

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
