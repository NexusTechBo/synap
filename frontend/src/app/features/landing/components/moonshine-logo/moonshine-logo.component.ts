import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Proporciones del logotipo original (palabra a 84px). */
const BASE_WORD = 84;

@Component({
  selector: 'app-moonshine-logo',
  template: `
    <span
      role="img"
      aria-label="Moonshine Technologies"
      class="inline-flex flex-col items-stretch"
      style="font-family: 'Sora', 'Inter', system-ui, sans-serif"
      [style.color]="color()"
    >
      <span
        aria-hidden="true"
        class="flex items-baseline"
        style="font-weight: 600; letter-spacing: -0.04em; line-height: 1"
        [style.font-size.px]="size()"
      >
        <span>M</span>
        <svg
          viewBox="0 0 100 100"
          [attr.width]="icon()"
          [attr.height]="icon()"
          [style.margin]="m().first"
        >
          <circle cx="50" cy="50" r="39" fill="none" stroke="currentColor" stroke-width="22" />
        </svg>
        <svg
          viewBox="10 10 80 80"
          [attr.width]="icon()"
          [attr.height]="icon()"
          [style.margin]="m().second"
        >
          <path d="M50 10 A40 40 0 1 0 90 50 A32 32 0 0 1 50 10 Z" fill="currentColor" />
        </svg>
        <span>nshine</span>
      </span>
      <span
        aria-hidden="true"
        class="flex justify-between"
        style="line-height: 1"
        [style.margin-top.px]="scale() * 14"
        [style.padding]="'0 ' + scale() * 2 + 'px 0 ' + scale() * 4 + 'px'"
        [style.font-size.px]="scale() * 16"
      >
        <span>T</span><span>E</span><span>C</span><span>H</span><span>N</span><span>O</span
        ><span>L</span><span>O</span><span>G</span><span>I</span><span>E</span><span>S</span>
      </span>
    </span>
  `,
  host: { class: 'inline-block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoonshineLogoComponent {
  readonly color = input('#FFFFFF');
  readonly size = input(28);

  protected readonly scale = computed(() => this.size() / BASE_WORD);
  protected readonly icon = computed(() => Math.round(this.scale() * 46 * 100) / 100);
  protected readonly m = computed(() => {
    const s = this.scale();
    return {
      first: `0 ${s * 3}px 0 ${s * 4}px`,
      second: `0 ${s * 2}px 0 ${s}px`,
    };
  });
}
