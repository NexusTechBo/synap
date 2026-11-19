import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { PulsoLogoComponent } from '../../ui/pulso-logo/pulso-logo.component';

export type BannerVariant = 'login' | 'register' | 'activation';

interface BannerStat {
  value: string;
  labelKey: string;
}

interface BannerStep {
  number: string;
  titleKey: string;
  subtitleKey: string;
  current: boolean;
}

interface BannerContent {
  headlineKey: string;
  introKey?: string;
  stats: BannerStat[];
  steps: BannerStep[];
}

const CONTENT: Record<BannerVariant, BannerContent> = {
  login: {
    headlineKey: 'banner.login.headline',
    stats: [
      { value: '3', labelKey: 'banner.login.stats.roles' },
      { value: '0', labelKey: 'banner.login.stats.installations' },
      { value: '24/7', labelKey: 'banner.login.stats.cloud' },
    ],
    steps: [],
  },
  register: {
    headlineKey: 'banner.register.headline',
    introKey: 'banner.register.intro',
    stats: [],
    steps: [
      {
        number: '01',
        titleKey: 'banner.steps.create',
        subtitleKey: 'banner.status.here',
        current: true,
      },
      {
        number: '02',
        titleKey: 'banner.steps.activate',
        subtitleKey: 'banner.status.linkSent',
        current: false,
      },
      {
        number: '03',
        titleKey: 'banner.steps.configure',
        subtitleKey: 'banner.status.configure',
        current: false,
      },
    ],
  },
  activation: {
    headlineKey: 'banner.activation.headline',
    introKey: 'banner.activation.intro',
    stats: [],
    steps: [
      {
        number: '01',
        titleKey: 'banner.steps.create',
        subtitleKey: 'banner.status.done',
        current: false,
      },
      {
        number: '02',
        titleKey: 'banner.steps.activate',
        subtitleKey: 'banner.status.here',
        current: true,
      },
      {
        number: '03',
        titleKey: 'banner.steps.configure',
        subtitleKey: 'banner.status.configure',
        current: false,
      },
    ],
  },
};

@Component({
  selector: 'app-banner',
  imports: [PulsoLogoComponent, TranslatePipe],
  templateUrl: './banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BannerComponent {
  readonly variant = input<BannerVariant>('login');

  protected readonly content = computed(() => CONTENT[this.variant()]);
  protected readonly isLogin = computed(() => this.variant() === 'login');
}
