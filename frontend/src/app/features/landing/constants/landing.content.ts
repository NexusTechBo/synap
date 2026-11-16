import {
  LandingAudience,
  LandingFeature,
  LandingRole,
  LandingShot,
  LandingStep,
} from '../landing.model';

const SHOTS = 'landing/';

export const LANDING_ANCHORS = {
  audience: 'para-quien',
  features: 'funciones',
  roles: 'roles',
  howItWorks: 'como-funciona',
} as const;

export const LANDING_NAV = [
  { labelKey: 'landing.nav.audience', anchor: LANDING_ANCHORS.audience },
  { labelKey: 'landing.nav.features', anchor: LANDING_ANCHORS.features },
  { labelKey: 'landing.nav.roles', anchor: LANDING_ANCHORS.roles },
  { labelKey: 'landing.nav.howItWorks', anchor: LANDING_ANCHORS.howItWorks },
];

export const HERO_SHOT: LandingShot = {
  src: SHOTS + '11-assistant-board.webp',
  altKey: 'landing.hero.shotAlt',
};

export const LANDING_AUDIENCES: LandingAudience[] = [
  {
    icon: 'stethoscope',
    titleKey: 'landing.audience.items.independentTitle',
    descriptionKey: 'landing.audience.items.independentDesc',
  },
  {
    icon: 'patients',
    titleKey: 'landing.audience.items.officeTitle',
    descriptionKey: 'landing.audience.items.officeDesc',
  },
  {
    icon: 'staff',
    titleKey: 'landing.audience.items.multiOfficeTitle',
    descriptionKey: 'landing.audience.items.multiOfficeDesc',
  },
  {
    icon: 'building',
    titleKey: 'landing.audience.items.clinicTitle',
    descriptionKey: 'landing.audience.items.clinicDesc',
  },
];

export const LANDING_FEATURES: LandingFeature[] = [
  {
    icon: 'calendar',
    titleKey: 'landing.features.items.calendarTitle',
    descriptionKey: 'landing.features.items.calendarDesc',
  },
  {
    icon: 'board',
    titleKey: 'landing.features.items.boardTitle',
    descriptionKey: 'landing.features.items.boardDesc',
  },
  {
    icon: 'clock',
    titleKey: 'landing.features.items.availabilityTitle',
    descriptionKey: 'landing.features.items.availabilityDesc',
  },
  {
    icon: 'patients',
    titleKey: 'landing.features.items.patientsTitle',
    descriptionKey: 'landing.features.items.patientsDesc',
  },
  {
    icon: 'staff',
    titleKey: 'landing.features.items.staffTitle',
    descriptionKey: 'landing.features.items.staffDesc',
  },
  {
    icon: 'alert',
    titleKey: 'landing.features.items.notificationsTitle',
    descriptionKey: 'landing.features.items.notificationsDesc',
  },
];

export const LANDING_ROLES: LandingRole[] = [
  {
    labelKey: 'landing.roles.assistant.label',
    icon: 'list',
    titleKey: 'landing.roles.assistant.title',
    descriptionKey: 'landing.roles.assistant.description',
  },
  {
    labelKey: 'landing.roles.doctor.label',
    icon: 'stethoscope',
    titleKey: 'landing.roles.doctor.title',
    descriptionKey: 'landing.roles.doctor.description',
  },
  {
    labelKey: 'landing.roles.admin.label',
    icon: 'staff',
    titleKey: 'landing.roles.admin.title',
    descriptionKey: 'landing.roles.admin.description',
  },
];

export const LANDING_STEPS: LandingStep[] = [
  {
    titleKey: 'landing.steps.step1Title',
    descriptionKey: 'landing.steps.step1Desc',
  },
  {
    titleKey: 'landing.steps.step2Title',
    descriptionKey: 'landing.steps.step2Desc',
  },
  {
    titleKey: 'landing.steps.step3Title',
    descriptionKey: 'landing.steps.step3Desc',
  },
];
