import {
  LandingFeature,
  LandingRole,
  LandingShot,
  LandingShowcase,
  LandingStep,
} from '../landing.model';

const SHOTS = 'landing/';

export const LANDING_ANCHORS = {
  features: 'funciones',
  product: 'producto',
  roles: 'roles',
  howItWorks: 'como-funciona',
} as const;

export const LANDING_NAV = [
  { labelKey: 'landing.nav.features', anchor: LANDING_ANCHORS.features },
  { labelKey: 'landing.nav.product', anchor: LANDING_ANCHORS.product },
  { labelKey: 'landing.nav.roles', anchor: LANDING_ANCHORS.roles },
  { labelKey: 'landing.nav.howItWorks', anchor: LANDING_ANCHORS.howItWorks },
];

export const HERO_SHOT: LandingShot = {
  src: SHOTS + '11-assistant-board.webp',
  altKey: 'landing.hero.shotAlt',
};

export const HERO_MOBILE_SHOT: LandingShot = {
  src: SHOTS + '41-mobile-assistant-dashboard.webp',
  altKey: 'landing.hero.mobileShotAlt',
};

export const LANDING_STATS = [
  { value: '3', labelKey: 'landing.stats.roles' },
  { value: '24/7', labelKey: 'landing.stats.cloud' },
  { value: '100%', labelKey: 'landing.stats.responsive' },
  { value: '0', labelKey: 'landing.stats.installations' },
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

export const LANDING_SHOWCASE: LandingShowcase[] = [
  {
    eyebrowKey: 'landing.showcase.calendar.eyebrow',
    titleKey: 'landing.showcase.calendar.title',
    descriptionKey: 'landing.showcase.calendar.description',
    pointKeys: [
      'landing.showcase.calendar.point1',
      'landing.showcase.calendar.point2',
      'landing.showcase.calendar.point3',
    ],
    shot: {
      src: SHOTS + '12-assistant-calendar.webp',
      altKey: 'landing.showcase.calendar.shotAlt',
    },
  },
  {
    eyebrowKey: 'landing.showcase.booking.eyebrow',
    titleKey: 'landing.showcase.booking.title',
    descriptionKey: 'landing.showcase.booking.description',
    pointKeys: [
      'landing.showcase.booking.point1',
      'landing.showcase.booking.point2',
      'landing.showcase.booking.point3',
    ],
    shot: {
      src: SHOTS + '14-assistant-booking-ready.webp',
      altKey: 'landing.showcase.booking.shotAlt',
    },
  },
];

export const LANDING_ROLES: LandingRole[] = [
  {
    id: 'assistant',
    labelKey: 'landing.roles.assistant.label',
    icon: 'list',
    titleKey: 'landing.roles.assistant.title',
    descriptionKey: 'landing.roles.assistant.description',
    shot: {
      src: SHOTS + '13-assistant-appointments.webp',
      altKey: 'landing.roles.assistant.shotAlt',
    },
  },
  {
    id: 'doctor',
    labelKey: 'landing.roles.doctor.label',
    icon: 'stethoscope',
    titleKey: 'landing.roles.doctor.title',
    descriptionKey: 'landing.roles.doctor.description',
    shot: {
      src: SHOTS + '21-doctor-availability.webp',
      altKey: 'landing.roles.doctor.shotAlt',
    },
  },
  {
    id: 'admin',
    labelKey: 'landing.roles.admin.label',
    icon: 'staff',
    titleKey: 'landing.roles.admin.title',
    descriptionKey: 'landing.roles.admin.description',
    shot: {
      src: SHOTS + '31-admin-staff.webp',
      altKey: 'landing.roles.admin.shotAlt',
    },
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
