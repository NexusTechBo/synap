import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type PulsoLogoVariant = 'positive' | 'negative' | 'dark';

interface PulsoLogoPalette {
  bg: string;
  stroke: string;
  dot: string;
  wordmark: string;
}

const PALETTES: Record<PulsoLogoVariant, PulsoLogoPalette> = {
  positive: { bg: '#1F5BD6', stroke: '#FFFFFF', dot: '#38A8E8', wordmark: '#0A2540' },
  negative: { bg: '#FFFFFF', stroke: '#1F5BD6', dot: '#38A8E8', wordmark: '#FFFFFF' },
  dark: { bg: '#1F5BD6', stroke: '#FFFFFF', dot: '#7DD3FC', wordmark: '#FFFFFF' },
};

@Component({
  selector: 'app-pulso-logo',
  template: `
    <span
      role="img"
      aria-label="Pulso"
      class="inline-flex items-center"
      [style.gap.px]="size() * 0.3"
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 64 64"
        [attr.width]="size()"
        [attr.height]="size()"
      >
        <rect width="64" height="64" rx="18" [attr.fill]="palette().bg" />
        <path
          d="M9 33 H20 L25 21 L33 45 L38 33 H46"
          fill="none"
          [attr.stroke]="palette().stroke"
          stroke-width="4.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="53" cy="33" r="4.2" [attr.fill]="palette().dot" />
      </svg>
      @if (wordmark()) {
        <span
          aria-hidden="true"
          class="font-brand font-semibold"
          [style.color]="palette().wordmark"
          [style.font-size.px]="size() * 0.9"
          style="letter-spacing: -0.035em; line-height: 1"
          >pulso</span
        >
      }
    </span>
  `,
  host: { class: 'inline-block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PulsoLogoComponent {
  readonly variant = input<PulsoLogoVariant>('positive');
  readonly wordmark = input(true);
  readonly size = input(36);

  protected readonly palette = computed(() => PALETTES[this.variant()]);
}
