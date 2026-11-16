import { UiIconName } from '../../shared/ui/ui-icon/ui-icon.component';

export interface LandingAudience {
  icon: UiIconName;
  titleKey: string;
  descriptionKey: string;
}

export interface LandingFeature {
  icon: UiIconName;
  titleKey: string;
  descriptionKey: string;
}

export interface LandingStep {
  titleKey: string;
  descriptionKey: string;
}

export interface LandingShot {
  src: string;
  altKey: string;
}

export interface LandingRole {
  labelKey: string;
  icon: UiIconName;
  titleKey: string;
  descriptionKey: string;
}
