import { UiIconName } from '../../shared/ui/ui-icon/ui-icon.component';

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

export interface LandingShowcase {
  eyebrowKey: string;
  titleKey: string;
  descriptionKey: string;
  pointKeys: string[];
  shot: LandingShot;
}

export interface LandingRole {
  id: string;
  labelKey: string;
  icon: UiIconName;
  titleKey: string;
  descriptionKey: string;
  shot: LandingShot;
}
